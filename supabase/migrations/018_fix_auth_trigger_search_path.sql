-- Recuperada de supabase_migrations.schema_migrations em 2026-09-24:
-- aplicada no projeto remoto sem arquivo no repositório. Conteúdo como está no banco.

-- ============================================
-- Migration 018: Fix Auth Trigger Search Path
-- ============================================
-- Supabase recently tightened security on triggers running in the auth schema.
-- SECURITY DEFINER functions now require explicit search_path or fully 
-- qualified table names (e.g. public.organizations) to avoid 
-- 'relation does not exist' errors during signup.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  user_org_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  user_org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', user_name || '''s Org');

  -- Create organization
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    user_org_name,
    LOWER(REPLACE(user_org_name, ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Create profile with email
  INSERT INTO public.profiles (user_id, org_id, role, display_name, email)
  VALUES (NEW.id, new_org_id, 'presenter', user_name, NEW.email);

  RETURN NEW;
END;
$$;
