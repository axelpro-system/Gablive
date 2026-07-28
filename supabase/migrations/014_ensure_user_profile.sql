-- ============================================
-- Migration 014: Ensure authenticated user profile/org
-- ============================================
-- Some authenticated users can reach the app without a usable profile/org
-- when the signup trigger was not present, failed, or a profile row was
-- partially created. This function gives the client a safe recovery path.

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  org_id UUID,
  role TEXT,
  display_name TEXT,
  email TEXT,
  locale TEXT,
  organization JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_name TEXT;
  v_org_name TEXT;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_email := COALESCE(auth.jwt()->>'email', '');
  v_name := COALESCE(
    auth.jwt()->'user_metadata'->>'name',
    auth.jwt()->'user_metadata'->>'full_name',
    NULLIF(v_email, ''),
    'User'
  );
  v_org_name := COALESCE(
    auth.jwt()->'user_metadata'->>'org_name',
    v_name || '''s Org'
  );

  SELECT p.org_id
    INTO v_org_id
  FROM public.profiles p
  WHERE p.user_id = v_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      v_org_name,
      LOWER(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(v_user_id::text, 1, 8),
      v_user_id
    )
    RETURNING organizations.id INTO v_org_id;

    INSERT INTO public.profiles (user_id, org_id, role, display_name, email)
    VALUES (v_user_id, v_org_id, 'presenter', v_name, NULLIF(v_email, ''))
    ON CONFLICT (user_id) DO UPDATE
      SET org_id = EXCLUDED.org_id,
          display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
          email = COALESCE(public.profiles.email, EXCLUDED.email),
          updated_at = now();
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.org_id,
    p.role,
    p.display_name,
    p.email,
    p.locale,
    to_jsonb(o.*) AS organization
  FROM public.profiles p
  LEFT JOIN public.organizations o ON o.id = p.org_id
  WHERE p.user_id = v_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
