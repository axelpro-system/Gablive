-- ============================================
-- 017 — Recuperação de inscrição existente
-- Quem já se inscreveu e tenta de novo (outro aparelho, localStorage limpo)
-- recebe de novo o e-mail de confirmação com o link ?reg=<id>.
--
-- NÃO devolve a linha de registrations: o id é o token de acesso à sala.
-- check_registration_email só retorna boolean; devolver a row ampliaria
-- a superfície (quem souber o e-mail obteria o token).
--
-- p_app_base_url é ignorado de propósito: origem do link sai só de
-- organizations.app_base_url, para não virar phishing via RPC anônimo.
-- Reenvio é limitado a 1 a cada 15 minutos por inscrição.
-- ============================================

DROP FUNCTION IF EXISTS recover_registration(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION recover_registration(
  p_webinar_id UUID,
  p_email TEXT,
  p_app_base_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id UUID;
  v_config_id UUID;
  v_recent BOOLEAN;
  v_org_base TEXT;
BEGIN
  IF p_webinar_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN false;
  END IF;

  SELECT id INTO v_reg_id
  FROM registrations
  WHERE webinar_id = p_webinar_id
    AND lower(email) = lower(trim(p_email))
  ORDER BY registered_at ASC
  LIMIT 1;

  IF v_reg_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_config_id
  FROM email_configs
  WHERE webinar_id = p_webinar_id
    AND type = 'confirmation'
    AND enabled = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_config_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM email_queue
    WHERE registration_id = v_reg_id
      AND email_config_id = v_config_id
      AND (
        status = 'pending'
        OR (
          status IN ('sent', 'failed')
          AND COALESCE(sent_at, created_at) > now() - interval '15 minutes'
        )
      )
  ) INTO v_recent;

  IF v_recent THEN
    RETURN true;
  END IF;

  SELECT NULLIF(trim(o.app_base_url), '') INTO v_org_base
  FROM webinars w
  JOIN organizations o ON o.id = w.org_id
  WHERE w.id = p_webinar_id;

  IF v_org_base IS NOT NULL THEN
    v_org_base := regexp_replace(v_org_base, '/$', '');
  END IF;

  INSERT INTO email_queue (
    email_config_id,
    registration_id,
    scheduled_at,
    status,
    attempts,
    app_base_url
  )
  VALUES (
    v_config_id,
    v_reg_id,
    now(),
    'pending',
    0,
    v_org_base
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION recover_registration(UUID, TEXT, TEXT) TO anon, authenticated;
