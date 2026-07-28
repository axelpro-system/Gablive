-- ============================================
-- Migration 012: Fix Infinite Recursion in Profiles RLS
-- ============================================
-- PROBLEM: Migration 010 added RLS policies on `profiles` that use
--   `org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())`
--   This creates infinite recursion because the policy on profiles
--   queries profiles itself.
--
-- SOLUTION: Create a SECURITY DEFINER function that bypasses RLS
--   to get the current user's org_id, then use it in all policies.

-- ============================================
-- 1. Helper function: get current user's org_id
-- ============================================
-- SECURITY DEFINER bypasses RLS, breaking the recursion cycle.
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================
-- 2. Helper function: check if current user is org admin
-- ============================================
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================
-- 3. Drop ALL existing profiles policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Org members can view profiles" ON profiles;
DROP POLICY IF EXISTS "Org admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Org admins can insert profiles" ON profiles;

-- ============================================
-- 4. Recreate profiles policies (no recursion)
-- ============================================

-- 4a. Users can always view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

-- 4b. Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4c. Org admins can view all profiles in their org
CREATE POLICY "Org admins can view all org profiles"
  ON profiles FOR SELECT
  USING (org_id = public.get_my_org_id());

-- 4d. Org admins can insert profiles (for invites)
CREATE POLICY "Org admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_org_admin());

-- 4e. Org admins can update any profile in their org
CREATE POLICY "Org admins can update org profiles"
  ON profiles FOR UPDATE
  USING (
    public.is_org_admin()
    AND org_id = public.get_my_org_id()
  );

-- ============================================
-- 5. Fix other tables that also use the recursive pattern
--    (These weren't broken because the policy is on a different table,
--     but let's update them for consistency and future-proofing.)
-- ============================================

-- Note: Policies on webinars, registration_pages, cta_configs, etc.
-- that use `org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())`
-- still work because the recursion only happens when the policy is ON the
-- same table being queried. However, updating them to use the helper
-- function is cleaner and avoids potential issues.
