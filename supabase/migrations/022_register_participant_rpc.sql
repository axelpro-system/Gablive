-- ============================================
-- Root-cause fix for public registration being blocked by RLS.
--
-- RegistrationPage.jsx does `.insert({...}).select().single()`. The INSERT
-- itself was always allowed ("Anyone can register" WITH CHECK (true)), but
-- .select() requires the anon role to read the row back, and the SELECT
-- policy on registrations (005_phase0_scale.sql) is org-scoped only. anon
-- can never see the row it just inserted, so Postgres reports the whole
-- operation as an RLS violation on INSERT — breaking every public signup.
--
-- Fix follows the existing SECURITY DEFINER RPC pattern already used for
-- anon-safe registration reads (check_registration_email,
-- get_registration_by_id, mark_registration_attended, recover_registration):
-- do the insert server-side and return the row, bypassing the SELECT policy.
-- ============================================

CREATE OR REPLACE FUNCTION register_participant(
  p_webinar_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_session_start_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg registrations;
BEGIN
  INSERT INTO registrations (webinar_id, name, email, phone, session_start_at)
  VALUES (p_webinar_id, p_name, lower(trim(p_email)), p_phone, p_session_start_at)
  RETURNING * INTO v_reg;

  RETURN v_reg;
END;
$$;

GRANT EXECUTE ON FUNCTION register_participant(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;
