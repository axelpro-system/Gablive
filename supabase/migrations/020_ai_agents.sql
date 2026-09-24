-- Recuperada de supabase_migrations.schema_migrations em 2026-09-24:
-- aplicada no projeto remoto sem arquivo no repositório. Conteúdo como está no banco.

-- ============================================
-- Migration 019: AI Agents Feature (Gemini)
-- ============================================

-- Add AI Agent configuration to webinars
ALTER TABLE webinars 
  ADD COLUMN IF NOT EXISTS ai_agent_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_agent_prompt TEXT;
-- Add AI indicator to chat messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;
-- Allow edge functions (service_role) to insert AI messages bypassing normal RLS if needed,
-- or just rely on service_role bypassing all RLS by default.;
