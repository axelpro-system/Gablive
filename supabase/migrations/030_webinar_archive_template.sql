-- ============================================
-- Migration 030: Webinar archive + template flag
-- ============================================
-- WebinarsListPage only offered edit/copy-link/preview/analytics/delete —
-- no way to archive a webinar without deleting it, and no way to mark
-- one as a reusable template for recurring events.

ALTER TABLE webinars
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_webinars_org_archived
  ON webinars (org_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_webinars_org_template
  ON webinars (org_id, is_template);
