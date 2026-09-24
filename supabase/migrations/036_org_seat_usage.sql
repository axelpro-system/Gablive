-- Uso de assentos e decisão de convite (spec valor-saude-planos, fatia 4).
-- A decisão "pode convidar?" vive AQUI, no banco: a Edge Function de convite e a tela
-- de Usuários consultam a mesma regra, então ela não se duplica entre servidor e cliente.

-- Situação de assentos de uma org, sem checagem de quem chama.
-- Só service_role (Edge Functions) e as RPCs abaixo usam diretamente.
CREATE OR REPLACE FUNCTION org_seat_status(p_org_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'org_id', p_org_id,
    'has_subscription', s.id IS NOT NULL,
    'plan', CASE WHEN p.id IS NULL THEN NULL
                 ELSE jsonb_build_object('code', p.code, 'name', p.name) END,
    'status', s.status,
    'trial_ends_at', s.trial_ends_at,
    'used', _org_seats_used(p_org_id),
    'limit', p.seat_limit,
    -- Sem assinatura ou plano sem limite: nunca bloqueia (convites seguem como antes).
    -- Trial expirado NÃO bloqueia nesta fase (decisão provisória: só aviso).
    'can_invite', (p.seat_limit IS NULL OR _org_seats_used(p_org_id) < p.seat_limit)
  )
  FROM (SELECT p_org_id AS org_id) x
  LEFT JOIN org_subscriptions s ON s.org_id = x.org_id
  LEFT JOIN plans p ON p.id = s.plan_id;
$$;

REVOKE ALL ON FUNCTION org_seat_status(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION org_seat_status(UUID) TO service_role;

-- Uso de assentos para a tela: a própria org (qualquer membro) ou a equipe da plataforma.
-- Não expõe observações internas da assinatura.
CREATE OR REPLACE FUNCTION get_org_seat_usage(p_org_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_org UUID;
  v_org UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT org_id INTO v_caller_org FROM profiles WHERE user_id = auth.uid() LIMIT 1;
  v_org := COALESCE(p_org_id, v_caller_org);

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_org IS DISTINCT FROM v_caller_org AND NOT is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN org_seat_status(v_org);
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_seat_usage(UUID) TO authenticated;
