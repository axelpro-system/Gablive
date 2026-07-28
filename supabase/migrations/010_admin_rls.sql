-- ============================================
-- Migration 010: Admin RLS & Profiles Email
-- ============================================
-- 1. Adiciona coluna email à profiles
-- 2. Atualiza handle_new_user para salvar email
-- 3. RLS: org members veem profiles da org
-- 4. RLS: org admins podem atualizar profiles

-- ============================================
-- 1. Add email column to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill emails for existing profiles where possible
-- (uses auth.users via a subquery with SECURITY DEFINER)
DO $$
BEGIN
  UPDATE profiles p
  SET email = au.email
  FROM auth.users au
  WHERE p.user_id = au.id
    AND p.email IS NULL;
END $$;

-- ============================================
-- 2. Update handle_new_user to save email
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  user_org_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  user_org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', user_name || '''s Org');

  -- Create organization
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (
    user_org_name,
    LOWER(REPLACE(user_org_name, ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Create profile with email
  INSERT INTO profiles (user_id, org_id, role, display_name, email)
  VALUES (NEW.id, new_org_id, 'presenter', user_name, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Drop restrictive existing RLS policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- ============================================
-- 4. New RLS policies for org-scoped access
-- ============================================

-- 4a. Org members can view all profiles in their org
CREATE POLICY "Org members can view profiles"
  ON profiles FOR SELECT
  USING (
    org_id IN (
      SELECT p2.org_id FROM profiles p2
      WHERE p2.user_id = auth.uid()
    )
  );

-- 4b. Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4c. Org admins can update any profile in their org
CREATE POLICY "Org admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    org_id IN (
      SELECT p2.org_id FROM profiles p2
      WHERE p2.user_id = auth.uid()
        AND p2.role = 'admin'
    )
  );

-- 4d. Org admins can insert new profiles (for invites)
CREATE POLICY "Org admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT p2.org_id FROM profiles p2
      WHERE p2.user_id = auth.uid()
        AND p2.role = 'admin'
    )
  );
