-- ============================================
-- Migration 027: Webinar capacity + waitlist
-- ============================================
-- No column existed to cap the number of registrations for a webinar —
-- any volume of signups was always accepted. Adds an optional capacity
-- (NULL = unlimited) and a waitlisted flag: once capacity is reached,
-- new registrations are still accepted but flagged as waitlisted instead
-- of being silently treated the same as a confirmed spot.

ALTER TABLE webinars
  ADD COLUMN IF NOT EXISTS capacity INTEGER CHECK (capacity IS NULL OR capacity > 0);

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS waitlisted BOOLEAN NOT NULL DEFAULT false;

-- Same 10-arg signature as migration 026 — CREATE OR REPLACE updates the body in place.
CREATE OR REPLACE FUNCTION register_participant(
  p_webinar_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_session_start_at TIMESTAMPTZ DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL
)
RETURNS registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg registrations;
  v_capacity INTEGER;
  v_current_count INTEGER;
  v_waitlisted BOOLEAN := false;
BEGIN
  SELECT capacity INTO v_capacity FROM webinars WHERE id = p_webinar_id;

  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_current_count
    FROM registrations
    WHERE webinar_id = p_webinar_id AND waitlisted = false;

    IF v_current_count >= v_capacity THEN
      v_waitlisted := true;
    END IF;
  END IF;

  INSERT INTO registrations (
    webinar_id, name, email, phone, session_start_at, waitlisted,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content
  )
  VALUES (
    p_webinar_id, p_name, lower(trim(p_email)), p_phone, p_session_start_at, v_waitlisted,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_term, p_utm_content
  )
  RETURNING * INTO v_reg;

  RETURN v_reg;
END;
$$;

GRANT EXECUTE ON FUNCTION register_participant(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;
