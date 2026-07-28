-- ============================================
-- Migration 015: AI Agents
-- ============================================

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (
    agent_type IN (
      'webinar_builder',
      'conversion_analyst',
      'integration_debugger',
      'follow_up'
    )
  ),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, agent_type)
);

CREATE TABLE IF NOT EXISTS ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (
    agent_type IN (
      'webinar_builder',
      'conversion_analyst',
      'integration_debugger',
      'follow_up'
    )
  ),
  target_type TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'completed', 'failed')
  ),
  input_context JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES ai_agent_runs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_agent_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES ai_agent_runs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL DEFAULT 'Artefato',
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_org_type ON ai_agents(org_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_org_created ON ai_agent_runs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_target ON ai_agent_runs(org_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_messages_run ON ai_agent_messages(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_agent_artifacts_run ON ai_agent_artifacts(run_id, created_at);

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view ai agents" ON ai_agents;
CREATE POLICY "Org members can view ai agents"
  ON ai_agents FOR SELECT
  USING (
    org_id IS NULL OR org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can view ai runs" ON ai_agent_runs;
CREATE POLICY "Org members can view ai runs"
  ON ai_agent_runs FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Org members can insert ai runs" ON ai_agent_runs;
CREATE POLICY "Org members can insert ai runs"
  ON ai_agent_runs FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Org members can view ai messages" ON ai_agent_messages;
CREATE POLICY "Org members can view ai messages"
  ON ai_agent_messages FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Org members can view ai artifacts" ON ai_agent_artifacts;
CREATE POLICY "Org members can view ai artifacts"
  ON ai_agent_artifacts FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

INSERT INTO ai_agents (org_id, agent_type, name, description, enabled)
VALUES
  (NULL, 'webinar_builder', 'Gerador de webinar', 'Cria estrutura inicial de webinar, página, CTAs, enquetes e timeline.', true),
  (NULL, 'conversion_analyst', 'Analista de conversão', 'Analisa métricas, retenção, CTAs e vendas para sugerir otimizações.', true),
  (NULL, 'integration_debugger', 'Diagnóstico de integração', 'Diagnostica Hotmart/Selflux, webhooks, eventos e mapeamentos.', true),
  (NULL, 'follow_up', 'Follow-up inteligente', 'Segmenta leads e cria mensagens de follow-up baseadas em comportamento.', true)
ON CONFLICT (org_id, agent_type) DO NOTHING;
