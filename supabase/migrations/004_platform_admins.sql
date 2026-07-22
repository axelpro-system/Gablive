-- ============================================
-- WEBINAR SAAS — v1.5: Platform Administrators
-- Adds platform_admins table for true super-admin access
-- and extends audit_logs for platform-level events
-- ============================================

-- ============================================
-- PLATFORM ADMINS (super-admin, not per-org)
-- ============================================
CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage platform admins
CREATE POLICY "Platform admins can view platform_admins"
  ON platform_admins FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM platform_admins)
  );

CREATE POLICY "Platform admins can insert platform_admins"
  ON platform_admins FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM platform_admins)
  );

CREATE POLICY "Platform admins can delete platform_admins"
  ON platform_admins FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM platform_admins)
  );

-- ============================================
-- EXTEND AUDIT LOGS: add platform-level scope
-- ============================================
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS is_platform_action BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_audit_logs_platform ON audit_logs(is_platform_action) WHERE is_platform_action = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ============================================
-- ORGANIZATIONS: add platform-level fields
-- ============================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification')),
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- ============================================
-- PLATFORM AUDIT LOG VIEW: org admins see own org,
-- platform admins see all
-- ============================================
-- RLS already allows org members to see their org's logs.
-- For platform admins viewing all logs, we add a bypass policy:
CREATE POLICY "Platform admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    is_platform_action = true
    AND auth.uid() IN (SELECT user_id FROM platform_admins)
  );

-- ============================================
-- Insert the first platform admin (you — run manually or via seed)
-- To add yourself as platform admin after this migration:
--   INSERT INTO platform_admins (user_id, display_name, email)
--   SELECT id, 'Your Name', email
--   FROM auth.users
--   WHERE email = 'your@email.com';
-- ============================================
