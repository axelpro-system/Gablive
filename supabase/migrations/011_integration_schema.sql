-- ============================================
-- Migration 011: Multi-Provider Integration Schema
-- ============================================
-- 1. integration_providers — catalog of supported providers
-- 2. integration_credentials — encrypted creds per org/provider
-- 3. integration_product_mappings — product/offer → webinar
-- 4. integration_events — received webhooks (idempotency)
-- 5. RLS policies (org-scoped)
-- 6. Indexes for performance

-- ============================================
-- 1. INTEGRATION PROVIDERS (Catalog)
-- ============================================
-- Static catalog of supported providers.
-- Seeds data for hotmart + selflux; extend by inserting rows.
CREATE TABLE integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'hotmart', 'selflux'
  name TEXT NOT NULL,                   -- 'Hotmart', 'Selflux'
  description TEXT,
  auth_type TEXT NOT NULL DEFAULT 'api_key'
    CHECK (auth_type IN ('api_key', 'oauth2', 'webhook_secret')),
  config_schema JSONB DEFAULT '{}',    -- { api_key_label, api_url_label, ... }
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed supported providers
INSERT INTO integration_providers (slug, name, description, auth_type, config_schema) VALUES
  (
    'hotmart',
    'Hotmart',
    'Plataforma de infoprodutos — webhooks de compra, aprovação e cancelamento.',
    'api_key',
    '{"secret_label": "Client ID:Client Secret (OAuth2)", "api_url_label": "Base URL", "default_api_url": "https://api.hotmart.com", "help_text": "Formato: client_id:client_secret (obtido no painel Hotmart v2)"}'
  ),
  (
    'selflux',
    'Selflux',
    'Plataforma de webinários e checkout — integração via webhook.',
    'webhook_secret',
    '{"webhook_secret_label": "Webhook Secret", "api_key_label": "API Key", "api_url_label": "Base URL", "default_api_url": "https://api.selflux.com.br"}'
  );

-- ============================================
-- 2. INTEGRATION CREDENTIALS (Per Org)
-- ============================================
-- Stores encrypted credentials per org per provider.
-- secrets are encrypted at rest via pgcrypto (or application-level AES).
-- The frontend NEVER receives the secret value back.
CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',       -- user-friendly label, e.g. "Produção"
  config JSONB DEFAULT '{}',            -- non-secret config (api_url, etc.)
  secret_encrypted TEXT,                -- encrypted secret (api_key, webhook_secret)
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'inactive', 'error')),
  last_tested_at TIMESTAMPTZ,
  last_test_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, provider_id, label)
);

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's credentials (without secret)
CREATE POLICY "Org members can view credentials"
  ON integration_credentials FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- Org admins can insert credentials
CREATE POLICY "Org admins can insert credentials"
  ON integration_credentials FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT p2.org_id FROM profiles p2
      WHERE p2.user_id = auth.uid()
        AND p2.role = 'admin'
    )
  );

-- Org admins can update credentials
CREATE POLICY "Org admins can update credentials"
  ON integration_credentials FOR UPDATE
  USING (
    org_id IN (
      SELECT p2.org_id FROM profiles p2
      WHERE p2.user_id = auth.uid()
        AND p2.role = 'admin'
    )
  );

-- Org admins can delete credentials
CREATE POLICY "Org admins can delete credentials"
  ON integration_credentials FOR DELETE
  USING (
    org_id IN (
      SELECT p2.org_id FROM profiles p2
      WHERE p2.user_id = auth.uid()
        AND p2.role = 'admin'
    )
  );

-- ============================================
-- 3. INTEGRATION PRODUCT MAPPINGS
-- ============================================
-- Maps a provider product/offer to a specific webinar.
-- Used to route webhook events to the correct webinar.
CREATE TABLE integration_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credential_id UUID NOT NULL REFERENCES integration_credentials(id) ON DELETE CASCADE,
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL,           -- denormalized for fast webhook lookup
  external_product_id TEXT NOT NULL,     -- provider's product/offer ID
  external_offer_name TEXT,              -- human-readable name from provider
  auto_approve BOOLEAN DEFAULT false,    -- auto-approve purchases for this mapping
  settings JSONB DEFAULT '{}',           -- provider-specific overrides
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(credential_id, external_product_id)
);

ALTER TABLE integration_product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view product mappings"
  ON integration_product_mappings FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Org admins can manage product mappings"
  ON integration_product_mappings FOR ALL
  USING (
    org_id IN (
      SELECT p2.org_id FROM profiles p2
      WHERE p2.user_id = auth.uid()
        AND p2.role = 'admin'
    )
  );

-- ============================================
-- 4. INTEGRATION EVENTS (Webhook Log + Idempotency)
-- ============================================
-- Logs every incoming webhook event.
-- external_event_id + provider_slug UNIQUE constraint ensures idempotency.
CREATE TABLE integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES integration_credentials(id) ON DELETE SET NULL,
  provider_slug TEXT NOT NULL,
  external_event_id TEXT NOT NULL,       -- provider's unique event/transaction ID
  event_type TEXT NOT NULL,              -- 'purchase.approved', 'purchase.cancelled', etc.
  payload JSONB NOT NULL DEFAULT '{}',   -- raw normalized payload
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'failed', 'skipped')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  idempotency_key TEXT GENERATED ALWAYS AS (provider_slug || ':' || external_event_id) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- Idempotency: one event per provider + external ID
CREATE UNIQUE INDEX idx_integration_events_idempotency
  ON integration_events(provider_slug, external_event_id);

-- Org members can view their events
CREATE POLICY "Org members can view events"
  ON integration_events FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- System (service-role) inserts events — no user insert policy needed
-- Webhook EF uses service-role to bypass RLS on insert

-- ============================================
-- 5. INDEXES
-- ============================================
CREATE INDEX idx_integration_credentials_org_id ON integration_credentials(org_id);
CREATE INDEX idx_integration_credentials_provider_id ON integration_credentials(provider_id);
CREATE INDEX idx_integration_credentials_org_provider ON integration_credentials(org_id, provider_id);

CREATE INDEX idx_integration_product_mappings_org_id ON integration_product_mappings(org_id);
CREATE INDEX idx_integration_product_mappings_webinar_id ON integration_product_mappings(webinar_id);
CREATE INDEX idx_integration_product_mappings_credential_id ON integration_product_mappings(credential_id);
CREATE INDEX idx_integration_product_mappings_provider_product
  ON integration_product_mappings(provider_slug, external_product_id);

CREATE INDEX idx_integration_events_org_id ON integration_events(org_id);
CREATE INDEX idx_integration_events_provider_slug ON integration_events(provider_slug);
CREATE INDEX idx_integration_events_status ON integration_events(status);
CREATE INDEX idx_integration_events_created_at ON integration_events(created_at);
CREATE INDEX idx_integration_events_event_type ON integration_events(event_type);
