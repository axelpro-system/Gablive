-- ============================================
-- WEBINAR SAAS — v1: Audit Log, Page Templates, Administrator Invites
-- Release: v1 (pós-MVP)
-- ============================================

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- PAGE TEMPLATES
-- ============================================
CREATE TABLE page_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'wait')),
  subtype TEXT DEFAULT 'legacy' CHECK (subtype IN (
    'legacy',           -- usa registration_pages 1:1 existente (fallback)
    'button_form',      -- registro com CTA + form
    'fixed_form',       -- registro com form fixo na tela
    'jit',              -- espera JIT
    'single'            -- espera único (sem JIT)
  )),
  blocks JSONB DEFAULT '[]',
  theme JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage page templates"
  ON page_templates FOR ALL
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- Templates também precisam ser visíveis publicamente para renderização
CREATE POLICY "Public can view page templates"
  ON page_templates FOR SELECT
  USING (true);

CREATE INDEX idx_page_templates_org_id ON page_templates(org_id);
CREATE INDEX idx_page_templates_type ON page_templates(type);

-- ============================================
-- WEBINARS: adicionar FK para templates de página
-- (nullable = backward-compatible: quando null, usa registration_pages 1:1 existente)
-- ============================================
ALTER TABLE webinars
  ADD COLUMN IF NOT EXISTS registration_page_template_id UUID REFERENCES page_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wait_page_template_id UUID REFERENCES page_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_webinars_reg_template ON webinars(registration_page_template_id);
CREATE INDEX IF NOT EXISTS idx_webinars_wait_template ON webinars(wait_page_template_id);

-- ============================================
-- PROFILES: adicionar papel detalhado no nível da org
-- (mantém coluna 'role' existente; adiciona invited_by + status para convite)
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'active' CHECK (invite_status IN ('pending', 'active', 'revoked')),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
