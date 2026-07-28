// ============================================
// Provider Adapter Registry
// ============================================
// Central registry for provider adapters.
// Import this to get the right adapter for a given provider slug.

import type { ProviderAdapter } from "./integration-types.ts";
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
