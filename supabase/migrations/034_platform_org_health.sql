-- Visão da plataforma: indicadores de valor de TODAS as orgs (spec valor-saude-planos, fatia 2).
-- Restrita à equipe da plataforma (platform_admins). A nota de saúde é calculada no cliente
-- (src/lib/orgHealth.js) para que pesos e cortes fiquem num único lugar, testável.
-- Plano e assentos entram na migration 035 (fatia 3), que substitui esta função.

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
        'last_registration_at', _org_last_registration_at(o.id)
      ) AS row_data
    FROM organizations o
  ) sub;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'orgs', result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_org_health(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
