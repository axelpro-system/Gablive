-- ============================================
-- FASE 0 — Enqueue confirmation email via RPC (anon-safe)
-- Public cannot INSERT email_queue directly (RLS); this SECURITY DEFINER
-- path creates a pending row for process-email-queue.
-- ============================================

CREATE OR REPLACE FUNCTION enqueue_confirmation_email(p_registration_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg registrations%ROWTYPE;
  v_config_id UUID;
  v_queue_id UUID;
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

  -- Avoid duplicate pending confirmation for the same registration+config
  SELECT id INTO v_queue_id
  FROM email_queue
  WHERE registration_id = p_registration_id
    AND email_config_id = v_config_id
    AND status IN ('pending', 'sent')
  LIMIT 1;

  IF v_queue_id IS NOT NULL THEN
    RETURN v_queue_id;
  END IF;

  INSERT INTO email_queue (
    email_config_id,
    registration_id,
    scheduled_at,
    status,
    attempts
  )
  VALUES (
    v_config_id,
    p_registration_id,
    now(),
    'pending',
    0
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION enqueue_confirmation_email(UUID) TO anon, authenticated;
