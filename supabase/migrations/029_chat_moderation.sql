-- ============================================
-- Migration 029: Chat moderation — delete message, ban participant
-- ============================================
-- chat_messages had no DELETE policy (operators could not remove a
-- message) and there was no ban mechanism at all — any RLS-anon client
-- could always insert regardless of prior behavior.

-- Org members (of the webinar's org) can delete chat messages.
CREATE POLICY "Org members can delete chat messages"
  ON chat_messages FOR DELETE
  USING (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE TABLE IF NOT EXISTS chat_banned_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (webinar_id, email)
);

CREATE INDEX IF NOT EXISTS idx_chat_banned_participants_webinar
  ON chat_banned_participants (webinar_id);

ALTER TABLE chat_banned_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view bans"
  ON chat_banned_participants FOR SELECT
  USING (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Org members can insert bans"
  ON chat_banned_participants FOR INSERT
  WITH CHECK (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Org members can remove bans"
  ON chat_banned_participants FOR DELETE
  USING (
    webinar_id IN (
      SELECT id FROM webinars
      WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Enforce the ban at the INSERT policy level so a banned participant
-- cannot post even by calling the anon insert directly (bypassing the UI).
DROP POLICY IF EXISTS "Anyone can send chat" ON chat_messages;
CREATE POLICY "Anyone can send chat"
  ON chat_messages FOR INSERT
  WITH CHECK (
    user_email IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM chat_banned_participants b
      WHERE b.webinar_id = chat_messages.webinar_id
        AND b.email = lower(chat_messages.user_email)
    )
  );
