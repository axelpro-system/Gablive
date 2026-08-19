-- ============================================
-- Migration 025: Real (non-simulated) audience mode
-- ============================================
-- audience_configs.mode was limited to 'none' | 'fixed' | 'dynamic' (simulated
-- counters). Adds 'real', backed by Supabase Realtime Presence in the room,
-- for operators who want a genuine viewer count instead of a simulated one.

ALTER TABLE audience_configs DROP CONSTRAINT IF EXISTS audience_configs_mode_check;
ALTER TABLE audience_configs ADD CONSTRAINT audience_configs_mode_check
  CHECK (mode IN ('none', 'fixed', 'dynamic', 'real'));
