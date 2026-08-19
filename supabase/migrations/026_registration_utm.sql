-- ============================================
-- Migration 026: Capture UTM parameters on registration
-- ============================================
-- registrations had no UTM columns despite UTM/LGPD being a stated
-- responsibility of the public funnel — operators couldn't attribute
-- conversions to campaigns.

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Replaces the 5-arg version from migration 022 with a 10-arg one (extra
-- params default NULL). Drop the old overload so PostgREST always resolves
-- to a single, unambiguous function for the 'register_participant' name.
DROP FUNCTION IF EXISTS register_participant(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ);

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
BEGIN
  INSERT INTO registrations (
    webinar_id, name, email, phone, session_start_at,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content
  )
  VALUES (
    p_webinar_id, p_name, lower(trim(p_email)), p_phone, p_session_start_at,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_term, p_utm_content
  )
  RETURNING * INTO v_reg;

  RETURN v_reg;
END;
$$;

GRANT EXECUTE ON FUNCTION register_participant(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;
