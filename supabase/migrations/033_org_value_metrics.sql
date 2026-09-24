-- Métricas de valor entregue por organização (spec valor-saude-planos, fatia 1).
-- Somente leitura: agrega dados que já existem (registrations, analytics_events, purchases).
--
-- Janela: [p_from, p_to). O período anterior tem a mesma duração e termina em p_from.
-- analytics_events não tem org_id: o vínculo com a org é feito pelo webinário.

-- Helper interno: indicadores de UMA org numa janela. Não é exposto ao cliente.
CREATE OR REPLACE FUNCTION _org_value_window(p_org_id UUID, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'registrations', (
      SELECT count(*)
      FROM registrations r
      JOIN webinars w ON w.id = r.webinar_id
      WHERE w.org_id = p_org_id
        AND r.waitlisted = false
        AND r.registered_at >= p_from AND r.registered_at < p_to
    ),
    'attendees', (
      SELECT count(*)
      FROM registrations r
      JOIN webinars w ON w.id = r.webinar_id
      WHERE w.org_id = p_org_id
        AND r.waitlisted = false
        AND r.attended = true
        AND r.registered_at >= p_from AND r.registered_at < p_to
    ),
    'cta_clicks', (
      SELECT count(*)
      FROM analytics_events e
      JOIN webinars w ON w.id = e.webinar_id
      WHERE w.org_id = p_org_id
        AND e.event_type = 'cta_click'
        AND e.created_at >= p_from AND e.created_at < p_to
    ),
    'approved_purchases', (
      SELECT count(*)
      FROM purchases pu
      WHERE pu.org_id = p_org_id
        AND pu.status = 'approved'
        AND pu.created_at >= p_from AND pu.created_at < p_to
    ),
    -- Receita separada por moeda: nunca somar BRL com USD.
    'revenue_by_currency', COALESCE((
      SELECT jsonb_object_agg(currency, total)
      FROM (
        SELECT COALESCE(pu.currency, 'BRL') AS currency, sum(pu.amount) AS total
        FROM purchases pu
        WHERE pu.org_id = p_org_id
          AND pu.status = 'approved'
          AND pu.amount IS NOT NULL
          AND pu.created_at >= p_from AND pu.created_at < p_to
        GROUP BY COALESCE(pu.currency, 'BRL')
      ) t
    ), '{}'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION _org_value_window(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- Helper interno: data da última inscrição (fora da lista de espera) da org, em qualquer período.
CREATE OR REPLACE FUNCTION _org_last_registration_at(p_org_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT max(r.registered_at)
  FROM registrations r
  JOIN webinars w ON w.id = r.webinar_id
  WHERE w.org_id = p_org_id AND r.waitlisted = false;
$$;

REVOKE ALL ON FUNCTION _org_last_registration_at(UUID) FROM PUBLIC, anon, authenticated;

-- Quem chama é administrador da plataforma?
-- platform_admins identifica o admin pelo e-mail (não há user_id no esquema real).
-- O e-mail vem de auth.users (não do JWT) e precisa estar confirmado.
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform_admins pa
    JOIN auth.users u ON lower(u.email) = lower(pa.email)
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND COALESCE(pa.is_active, true)
  );
$$;

GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- Métricas de uma org: a própria org ou a equipe da plataforma.
CREATE OR REPLACE FUNCTION get_org_value_metrics(
  p_org_id UUID,
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
  v_caller_org UUID;
  v_prev_from TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'invalid period' USING ERRCODE = '22023';
  END IF;

  IF NOT is_platform_admin() THEN
    SELECT org_id INTO v_caller_org FROM profiles WHERE user_id = auth.uid() LIMIT 1;
    IF v_caller_org IS NULL OR v_caller_org <> p_org_id THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_prev_from := p_from - (p_to - p_from);

  RETURN jsonb_build_object(
    'org_id', p_org_id,
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'current', _org_value_window(p_org_id, p_from, p_to),
    'previous', _org_value_window(p_org_id, v_prev_from, p_from),
    'last_registration_at', _org_last_registration_at(p_org_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_value_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Índices de apoio às janelas por data (idempotentes).
CREATE INDEX IF NOT EXISTS idx_registrations_webinar_registered_at
  ON registrations (webinar_id, registered_at);
CREATE INDEX IF NOT EXISTS idx_purchases_org_status_created
  ON purchases (org_id, status, created_at);
