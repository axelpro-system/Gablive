-- ============================================
-- Migration 016: Sales provider integrations reconcile
-- Hotmart / Selflux — credentials, mappings, webhook events
-- ============================================

-- Non-secret integration status (org members can read/manage)
CREATE TABLE IF NOT EXISTS org_sales_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hotmart', 'selflux')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  public_identifier TEXT,
  credentials_configured BOOLEAN NOT NULL DEFAULT false,
  webhook_secret_configured BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT CHECK (last_test_status IS NULL OR last_test_status IN ('success', 'failed')),
  last_test_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_org_sales_integrations_org
  ON org_sales_integrations (org_id);

ALTER TABLE org_sales_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view sales integrations" ON org_sales_integrations;
CREATE POLICY "Org members can view sales integrations"
  ON org_sales_integrations FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can insert sales integrations" ON org_sales_integrations;
CREATE POLICY "Org members can insert sales integrations"
  ON org_sales_integrations FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can update sales integrations" ON org_sales_integrations;
CREATE POLICY "Org members can update sales integrations"
  ON org_sales_integrations FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can delete sales integrations" ON org_sales_integrations;
CREATE POLICY "Org members can delete sales integrations"
  ON org_sales_integrations FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- Secrets: RLS on, no authenticated policies → only service_role
CREATE TABLE IF NOT EXISTS org_sales_secrets (
  integration_id UUID PRIMARY KEY REFERENCES org_sales_integrations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hotmart', 'selflux')),
  secrets JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_sales_secrets_org_provider
  ON org_sales_secrets (org_id, provider);

ALTER TABLE org_sales_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies for authenticated/anon.

-- Product/offer → webinar mappings
CREATE TABLE IF NOT EXISTS provider_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hotmart', 'selflux')),
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  provider_product_id TEXT NOT NULL,
  provider_offer_id TEXT,
  product_name TEXT,
  conversion_events TEXT[] NOT NULL DEFAULT ARRAY['purchase_approved']::TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT provider_product_mappings_product_id_not_blank
    CHECK (length(trim(provider_product_id)) > 0)
);

-- Unique: same product+offer mapping once per org/provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_mappings_unique
  ON provider_product_mappings (
    org_id,
    provider,
    provider_product_id,
    COALESCE(provider_offer_id, '')
  );

CREATE INDEX IF NOT EXISTS idx_provider_mappings_org
  ON provider_product_mappings (org_id, provider);

CREATE INDEX IF NOT EXISTS idx_provider_mappings_webinar
  ON provider_product_mappings (webinar_id);

ALTER TABLE provider_product_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view product mappings" ON provider_product_mappings;
CREATE POLICY "Org members can view product mappings"
  ON provider_product_mappings FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can insert product mappings" ON provider_product_mappings;
CREATE POLICY "Org members can insert product mappings"
  ON provider_product_mappings FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    AND webinar_id IN (
      SELECT id FROM webinars w
      WHERE w.org_id = provider_product_mappings.org_id
        AND w.org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org members can update product mappings" ON provider_product_mappings;
CREATE POLICY "Org members can update product mappings"
  ON provider_product_mappings FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    AND webinar_id IN (
      SELECT id FROM webinars w
      WHERE w.org_id = provider_product_mappings.org_id
    )
  );

DROP POLICY IF EXISTS "Org members can delete product mappings" ON provider_product_mappings;
CREATE POLICY "Org members can delete product mappings"
  ON provider_product_mappings FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- Normalized webhook events (idempotent)
CREATE TABLE IF NOT EXISTS provider_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webinar_id UUID REFERENCES webinars(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('hotmart', 'selflux')),
  provider_event_id TEXT NOT NULL,
  transaction_id TEXT,
  event_type TEXT NOT NULL DEFAULT 'unknown',
  product_id TEXT,
  offer_id TEXT,
  buyer_email TEXT,
  amount NUMERIC(12, 2),
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'ignored', 'failed', 'unmapped', 'duplicate')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_webhook_events_org
  ON provider_webhook_events (org_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_webhook_events_webinar
  ON provider_webhook_events (webinar_id)
  WHERE webinar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_webhook_events_status
  ON provider_webhook_events (org_id, status);

ALTER TABLE provider_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view webhook events" ON provider_webhook_events;
CREATE POLICY "Org members can view webhook events"
  ON provider_webhook_events FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- No INSERT/UPDATE/DELETE for authenticated — service_role only via Edge Functions.

-- Optional purchases rollup table (if phase-1 table not present)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webinar_id UUID REFERENCES webinars(id) ON DELETE SET NULL,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  buyer_email TEXT,
  amount NUMERIC(12, 2),
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'approved',
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, provider, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_webinar ON purchases (webinar_id);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view purchases" ON purchases;
CREATE POLICY "Org members can view purchases"
  ON purchases FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_sales_integrations_updated ON org_sales_integrations;
CREATE TRIGGER trg_org_sales_integrations_updated
  BEFORE UPDATE ON org_sales_integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_provider_product_mappings_updated ON provider_product_mappings;
CREATE TRIGGER trg_provider_product_mappings_updated
  BEFORE UPDATE ON provider_product_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
