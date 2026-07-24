-- Store the public SPA origin used when the lead registered so email CTAs
-- point at the app (e.g. https://app.gablive.com), not a marketing domain.

ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS app_base_url TEXT;

-- Optional: prefer org-level app URL when origin not captured
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS app_base_url TEXT;

DROP FUNCTION IF EXISTS enqueue_confirmation_email(UUID);
DROP FUNCTION IF EXISTS enqueue_confirmation_email(UUID, TEXT);

CREATE OR REPLACE FUNCTION enqueue_confirmation_email(
  p_registration_id UUID,
  p_app_base_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg registrations%ROWTYPE;
  v_config_id UUID;
  v_queue_id UUID;
  v_base TEXT;
  v_org_base TEXT;
BEGIN
  IF p_registration_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_reg
  FROM registrations
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_config_id
  FROM email_configs
  WHERE webinar_id = v_reg.webinar_id
    AND type = 'confirmation'
    AND enabled = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_config_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_queue_id
  FROM email_queue
  WHERE registration_id = p_registration_id
    AND email_config_id = v_config_id
    AND status IN ('pending', 'sent')
  LIMIT 1;

  IF v_queue_id IS NOT NULL THEN
    -- Refresh base URL if a better one arrives
    IF p_app_base_url IS NOT NULL AND length(trim(p_app_base_url)) > 0 THEN
      UPDATE email_queue
      SET app_base_url = regexp_replace(trim(p_app_base_url), '/$', '')
      WHERE id = v_queue_id
        AND (app_base_url IS NULL OR app_base_url = '');
    END IF;
    RETURN v_queue_id;
  END IF;

  SELECT o.app_base_url INTO v_org_base
  FROM webinars w
  JOIN organizations o ON o.id = w.org_id
  WHERE w.id = v_reg.webinar_id;

  v_base := NULLIF(trim(COALESCE(p_app_base_url, v_org_base, '')), '');
  IF v_base IS NOT NULL THEN
    v_base := regexp_replace(v_base, '/$', '');
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
    p_registration_id,
    now(),
    'pending',
    0,
    v_base
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION enqueue_confirmation_email(UUID, TEXT) TO anon, authenticated;
