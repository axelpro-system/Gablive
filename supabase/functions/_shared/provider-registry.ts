// ============================================
// Provider Adapter Registry
// ============================================
// Central registry for provider adapters.
// Import this to get the right adapter for a given provider slug.
// All provider-specific operations go through this registry.

import type { ProviderAdapter, NormalizedEvent } from "./integration-types.ts";
import { hotmartAdapter } from "./hotmart.ts";
import { selfluxAdapter } from "./selflux.ts";

const adapters: Record<string, ProviderAdapter> = {
  hotmart: hotmartAdapter,
  selflux: selfluxAdapter,
};

/** Get adapter by provider slug */
export function getProviderAdapter(slug: string): ProviderAdapter | undefined {
  return adapters[slug];
}

/** List all registered provider slugs */
export function listProviderSlugs(): string[] {
  return Object.keys(adapters);
}

/** Register a new adapter (for extensibility) */
export function registerAdapter(adapter: ProviderAdapter): void {
  adapters[adapter.slug] = adapter;
}

// ─── Convenience functions ───────────────────────────────────────

/**
 * Check if a provider slug is supported (has a registered adapter).
 */
export function isSupportedProvider(slug: string): boolean {
  return slug in adapters;
}

/**
 * Validate credential fields for a provider.
 * Delegates to the provider's adapter.
 */
export function validateCredentials(
  provider: string,
  credentials: Record<string, string> = {}
): { ok: boolean; missing: string[] } {
  const adapter = getProviderAdapter(provider);
  if (!adapter) return { ok: false, missing: ["provider"] };
  return adapter.validateCredentials(credentials);
}

/**
 * Extract webhook authentication secret from request headers/body.
 * Delegates to the provider's adapter.
 */
export function extractWebhookSecret(
  provider: string,
  headers: Record<string, string>,
  body?: Record<string, unknown>
): string | null {
  const adapter = getProviderAdapter(provider);
  if (!adapter) return null;
  return adapter.extractWebhookSecret(headers, body);
}

/**
 * Normalize a raw provider payload using the correct adapter.
 * Returns undefined if provider is not supported.
 */
export function normalizePayload(
  provider: string,
  payload: Record<string, unknown>
): NormalizedEvent | undefined {
  const adapter = getProviderAdapter(provider);
  if (!adapter) return undefined;
  return adapter.normalizePayload(payload);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Check if a normalized event is a purchase-approved event.
 */
export function isApprovedPurchaseEvent(event: NormalizedEvent): boolean {
  return event.eventType === "purchase.approved";
}
