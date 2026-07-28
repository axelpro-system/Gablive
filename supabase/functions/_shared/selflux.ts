// ============================================
// Selflux Provider Adapter
// ============================================
// Handles Selflux webhook validation, normalization, and status mapping.

import type {
  ProviderAdapter,
  NormalizedEvent,
  PurchaseStatus,
} from "./integration-types.ts";

// Selflux status → canonical status
const STATUS_MAP: Record<string, PurchaseStatus> = {
  approved: "approved",
  aprovado: "approved",
  confirmed: "approved",
  confirmado: "approved",
  paid: "approved",
  pago: "approved",
  pending: "pending",
  pendente: "pending",
  processing: "pending",
  cancelled: "cancelled",
  cancelado: "cancelled",
  canceled: "cancelled",
  refunded: "refunded",
  reembolsado: "refunded",
  chargeback: "chargeback",
  estorno: "chargeback",
  expired: "expired",
  expirado: "expired",
};

// Selflux event type normalization
const EVENT_TYPE_MAP: Record<string, string> = {
  "sale.approved": "purchase.approved",
  "sale.pending": "purchase.pending",
  "sale.cancelled": "purchase.cancelled",
  "sale.canceled": "purchase.cancelled",
  "sale.refunded": "purchase.refunded",
  "sale.chargeback": "purchase.chargeback",
  "sale.expired": "purchase.expired",
  "sale.completed": "purchase.approved",
  "purchase.approved": "purchase.approved",
  "purchase.pending": "purchase.pending",
  "purchase.cancelled": "purchase.cancelled",
  "purchase.refunded": "purchase.refunded",
  "lead.created": "lead.created",
  "lead.confirmed": "lead.confirmed",
  "subscription.created": "subscription.created",
  "subscription.renewed": "subscription.renewed",
  "subscription.cancelled": "subscription.cancelled",
};

class SelfluxAdapter implements ProviderAdapter {
  readonly slug = "selflux";

  /**
   * Validate Selflux webhook.
   * Selflux uses HMAC-SHA256 with a shared webhook secret.
   * Signature is sent in the X-Signature header.
   */
  async validateWebhook(
    headers: Record<string, string>,
    body: string,
    secret: string
  ): Promise<boolean> {
    const signature =
      headers["x-signature"] ||
      headers["X-Signature"] ||
      headers["x-webhook-signature"] ||
      headers["X-Webhook-Signature"];

    if (!signature || !secret) return false;

    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(body)
      );

      const computedHash = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Selflux may send "sha256=<hash>" or raw hex
      const expected = signature.startsWith("sha256=")
        ? signature.slice(7)
        : signature;

      return computedHash === expected;
    } catch {
      return false;
    }
  }

  /**
   * Normalize Selflux webhook payload to canonical format.
   * Selflux webhook structure (varies, but common fields):
   * { event, data: { product, buyer, transaction, ... } }
   * or flat: { event, product_id, status, transaction_id, ... }
   */
  normalizePayload(payload: Record<string, unknown>): NormalizedEvent {
    const data = (payload.data ?? payload) as Record<string, unknown>;
    const product = (data.product ?? data.product_info ?? {}) as Record<string, unknown>;
    const buyer = (data.buyer ?? data.customer ?? data.contact ?? {}) as Record<string, unknown>;

    const rawEvent = (payload.event ?? payload.event_type ?? "unknown") as string;
    const rawStatus = (data.status ?? data.purchase_status ?? data.situacao ?? "") as string;

    // Selflux may nest transaction differently
    const transaction = (data.transaction ?? data.transaction_data ?? data) as Record<string, unknown>;

    return {
      provider: this.slug,
      externalEventId: this.extractEventId(payload),
      eventType: EVENT_TYPE_MAP[rawEvent] ?? rawEvent.toLowerCase(),
      purchaseStatus: this.mapStatus(rawStatus),
      externalProductId: String(
        product.id ??
        data.product_id ??
        data.product_id_int ??
        ""
      ),
      productName: (product.name ?? product.title ?? product.nome ?? "") as string,
      buyer: {
        email: (buyer.email ?? buyer.email_address ?? "") as string,
        name: (buyer.name ?? buyer.nome ?? buyer.full_name ?? "") as string,
        document: (buyer.document ?? buyer.cpf ?? buyer.cnpj ?? "") as string,
      },
      amountCents: this.parseAmount(
        transaction.price ??
        transaction.amount ??
        transaction.valor ??
        data.price ??
        0
      ),
      currency: (transaction.currency ?? data.currency ?? "BRL") as string,
      rawPayload: payload,
    };
  }

  extractEventId(payload: Record<string, unknown>): string {
    const data = (payload.data ?? payload) as Record<string, unknown>;
    return String(
      payload.id ??
      data.transaction_id ??
      data.transaction ??
      data.purchase_id ??
      data.event_id ??
      crypto.randomUUID()
    );
  }

  mapStatus(rawStatus: string): PurchaseStatus {
    const normalized = rawStatus.toLowerCase().trim().replace(/\s+/g, "_");
    return STATUS_MAP[normalized] ?? "unknown";
  }

  /** Test Selflux API connectivity */
  async testCredentials(
    config: Record<string, string>,
    secret: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const baseUrl = config.api_url || "https://api.selflux.com.br";
      const token = secret || config.api_key || "";
      const response = await fetch(`${baseUrl}/v1/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) return { ok: true };
      if (response.status === 401) return { ok: false, error: "API key inválida ou expirada" };
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    } catch (err) {
      return { ok: false, error: `Falha de conexão: ${(err as Error).message}` };
    }
  }

  /**
   * Validate Selflux credential fields.
   */
  validateCredentials(
    credentials: Record<string, string>
  ): { ok: boolean; missing: string[] } {
    const missing: string[] = [];
    const c = credentials || {};

    if (!c.api_key?.trim()) missing.push("api_key");
    if (!c.webhook_secret?.trim()) missing.push("webhook_secret");

    return { ok: missing.length === 0, missing };
  }

  /**
   * Extract webhook secret from Selflux request.
   * Selflux can send via X-Webhook-Secret, X-Api-Key, Authorization Bearer, or in the body.
   */
  extractWebhookSecret(
    headers: Record<string, string>,
    body?: Record<string, unknown>
  ): string | null {
    const get = (name: string) => headers[name] || headers[name.toLowerCase()];
    const auth = get("Authorization");

    return (
      get("X-Webhook-Secret") ||
      get("X-Selflux-Secret") ||
      get("X-Api-Key") ||
      (auth ? auth.replace(/^Bearer\s+/i, "") : null) ||
      (body?.webhook_secret as string) ||
      (body?.api_key as string) ||
      null
    );
  }

  private parseAmount(value: unknown): number {
    if (typeof value === "number") return Math.round(value * 100);
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : Math.round(num * 100);
  }
}

export const selfluxAdapter = new SelfluxAdapter();
