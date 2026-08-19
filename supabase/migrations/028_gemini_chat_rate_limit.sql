-- ============================================
-- Migration 028: Rate limit for gemini-chat invocations
-- ============================================
-- gemini-chat is invoked on every chat message in a room with an AI agent
-- enabled (the agent decides server-side whether to reply), with no
-- server-side cap — a busy chat could trigger unbounded Gemini API calls
-- and unbounded cost for the operator. Adds a small table the edge
-- function uses to enforce a per-webinar sliding-window limit.

CREATE TABLE IF NOT EXISTS gemini_chat_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gemini_chat_invocations_webinar_time
  ON gemini_chat_invocations (webinar_id, invoked_at DESC);

ALTER TABLE gemini_chat_invocations ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon — service_role only (edge function).
