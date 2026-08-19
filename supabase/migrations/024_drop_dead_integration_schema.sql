-- ============================================
-- Migration 024: Drop dead "System B" integration schema
-- ============================================
-- integration_providers/integration_credentials/integration_product_mappings/
-- integration_events (from migration 011) were never wired to the UI —
-- manage-sales-integration + IntegrationsPage always used the
-- org_sales_integrations/org_sales_secrets/provider_product_mappings/
-- provider_webhook_events schema from migration 016 instead.
-- Their only consumers (save-integration-config, receive-integration-webhook
-- edge functions) have been removed. Drop in dependency order.

DROP TABLE IF EXISTS integration_events CASCADE;
DROP TABLE IF EXISTS integration_product_mappings CASCADE;
DROP TABLE IF EXISTS integration_credentials CASCADE;
DROP TABLE IF EXISTS integration_providers CASCADE;
