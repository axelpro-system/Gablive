-- Planos por assento e assinatura por organização (spec valor-saude-planos, fatia 3).
-- Sem cobrança automática: a equipe da plataforma ativa e ajusta planos manualmente.
--
-- Valores PROVISÓRIOS (decisões pendentes da spec), todos isolados aqui:
--   * plano de entrada com 2 assentos  -> seed de `plans` (dado, muda sem deploy)
--   * trial de 14 dias                 -> trigger `create_default_subscription`
--   * assento = qualquer profile da org (admin, presenter, attendee, inclusive convite
--     ainda não aceito, que já cria o profile) -> função `_org_seats_used`

-- ─── Tabelas ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  seat_limit INTEGER CHECK (seat_limit IS NULL OR seat_limit > 0), -- NULL = ilimitado
  reference_price_monthly NUMERIC(12, 2),                          -- informativo, não cobra
  is_active BOOLEAN NOT NULL DEFAULT true,                         -- false = não vendável para novas contas
  features JSONB NOT NULL DEFAULT '{}'::jsonb,                     -- reservado para add-ons futuros
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ,
  internal_notes TEXT, -- só a equipe da plataforma lê (ver RLS)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_plan ON org_subscriptions (plan_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Catálogo de planos: leitura para usuários autenticados; escrita só via service_role.
-- Assinaturas: leitura direta só pela equipe da plataforma (tem observações internas).
-- A org lê o próprio plano pela RPC get_org_seat_usage (migration 036), sem observações.
-- Nenhuma política de escrita: só service_role (admin-api) escreve.

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read plans" ON plans;
CREATE POLICY "Authenticated users can read plans"
  ON plans FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Platform admins can read subscriptions" ON org_subscriptions;
CREATE POLICY "Platform admins can read subscriptions"
  ON org_subscriptions FOR SELECT
  TO authenticated
  USING (is_platform_admin());

-- ─── Seed (idempotente) ─────────────────────────────────────────────────────

INSERT INTO plans (code, name, seat_limit, is_active)
VALUES
  ('legacy', 'Legado', NULL, false),
  ('starter', 'Entrada', 2, true)
ON CONFLICT (code) DO NOTHING;

-- ─── Backfill: toda org existente vai para o Legado (sem limite, ativa) ───────

INSERT INTO org_subscriptions (org_id, plan_id, status, started_at)
SELECT o.id, p.id, 'active', COALESCE(o.created_at, now())
FROM organizations o
CROSS JOIN (SELECT id FROM plans WHERE code = 'legacy') p
ON CONFLICT (org_id) DO NOTHING;

-- ─── Orgs novas: trial no plano de entrada ──────────────────────────────────
-- Trigger em organizations cobre todos os caminhos de criação
-- (handle_new_user, ensure_user_profile, admin-api).

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_subscriptions (org_id, plan_id, status, trial_ends_at)
  SELECT NEW.id, p.id, 'trial', now() + interval '14 days'
  FROM plans p
  WHERE p.code = 'starter'
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created_subscription ON organizations;
CREATE TRIGGER on_organization_created_subscription
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- ─── Assentos usados ────────────────────────────────────────────────────────
-- Regra provisória: todo profile da org ocupa assento, inclusive convite pendente.
-- Acesso revogado libera o assento. Leads (registrations) não contam.

CREATE OR REPLACE FUNCTION _org_seats_used(p_org_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM profiles
  WHERE org_id = p_org_id
    AND role IN ('admin', 'presenter', 'attendee')
    AND COALESCE(invite_status, 'active') <> 'revoked';
$$;

REVOKE ALL ON FUNCTION _org_seats_used(UUID) FROM PUBLIC, anon, authenticated;

-- ─── Visão da plataforma passa a incluir plano e assentos ────────────────────

CREATE OR REPLACE FUNCTION get_platform_org_health(
  p_from TIMESTAMPTZ DEFAULT now() - interval '30 days',
  p_to TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_from TIMESTAMPTZ;
  result JSONB;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'invalid period' USING ERRCODE = '22023';
  END IF;

  v_prev_from := p_from - (p_to - p_from);

  SELECT COALESCE(jsonb_agg(row_data ORDER BY o_name), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      o.name AS o_name,
      jsonb_build_object(
        'org_id', o.id,
        'name', o.name,
        'slug', o.slug,
        'status', o.status,
        'created_at', o.created_at,
        'current', _org_value_window(o.id, p_from, p_to),
        'previous', _org_value_window(o.id, v_prev_from, p_from),
        'last_registration_at', _org_last_registration_at(o.id),
        'seats_used', _org_seats_used(o.id),
        'subscription', CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
          'status', s.status,
          'trial_ends_at', s.trial_ends_at,
          'started_at', s.started_at,
          'internal_notes', s.internal_notes,
          'plan', jsonb_build_object(
            'id', p.id, 'code', p.code, 'name', p.name, 'seat_limit', p.seat_limit
          )
        ) END
      ) AS row_data
    FROM organizations o
    LEFT JOIN org_subscriptions s ON s.org_id = o.id
    LEFT JOIN plans p ON p.id = s.plan_id
  ) sub;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'orgs', result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_org_health(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Verificação pós-migration (deve retornar 0):
--   SELECT count(*) FROM organizations o
--   LEFT JOIN org_subscriptions s ON s.org_id = o.id WHERE s.id IS NULL;
