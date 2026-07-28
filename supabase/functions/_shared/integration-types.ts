// ============================================
// Integration Provider — Shared Types
// ============================================
// Canonical types for all provider adapters.
// Each adapter normalizes raw payloads to these types.

/** Normalized purchase status across all providers */
export type PurchaseStatus =
  | "approved"
  | "pending"
  | "cancelled"
  | "refunded"
  | "chargeback"
  | "expired"
  | "unknown";

/** Normalized webhook event from any provider */
export interface NormalizedEvent {
  /** Provider slug ('hotmart', 'selflux') */
  provider: string;
  /** Unique event/transaction ID from the provider */
  externalEventId: string;
  /** Normalized event type */
  eventType: string;
  /** Normalized purchase status */
  purchaseStatus: PurchaseStatus;
  /** Product/offer ID from the provider */
  externalProductId: string;
  /** Human-readable product name */
  productName?: string;
  /** Buyer info */
  buyer?: {
    email?: string;
    name?: string;
    document?: string;
  };
  /** Purchase amount in cents */
  amountCents?: number;
  /** Currency code (BRL, USD, etc.) */
  currency?: string;
  /** Raw provider payload (for debugging) */
  rawPayload: Record<string, unknown>;
}

/** Adapter interface that each provider must implement */
export interface ProviderAdapter {
  /** Provider slug */
  readonly slug: string;

  /** Validate webhook signature / authenticity */
  validateWebhook(
    headers: Record<string, string>,
    body: string,
    secret: string
  ): Promise<boolean>;

  /** Normalize raw provider payload to canonical format */
  normalizePayload(
    payload: Record<string, unknown>
  ): NormalizedEvent;

  /** Extract the unique event/transaction ID */
  extractEventId(payload: Record<string, unknown>): string;

  /** Map provider-specific status to canonical PurchaseStatus */
  mapStatus(rawStatus: string): PurchaseStatus;

  /** Test credentials connectivity (optional) */
  testCredentials?(
    config: Record<string, string>,
    secret: string
  ): Promise<{ ok: boolean; error?: string }>;

  /**
   * Validate credential fields (for save-time validation).
   * Returns which required fields are missing.
   */
  validateCredentials(
    credentials: Record<string, string>
  ): { ok: boolean; missing: string[] };

  /**
   * Extract webhook authentication secret from incoming request headers/body.
   * Different providers send the secret in different locations.
   */
  extractWebhookSecret(
    headers: Record<string, string>,
    body?: Record<string, unknown>
  ): string | null;
}
