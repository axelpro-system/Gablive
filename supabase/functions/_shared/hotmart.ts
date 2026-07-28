// ============================================
// Hotmart Provider Adapter
// ============================================
// Handles Hotmart webhook validation, normalization, and status mapping.
// Docs: https://developers.hotmart.com/

import type {
  ProviderAdapter,
  NormalizedEvent,
  PurchaseStatus,
} from "./integration-types.ts";

// Hotmart status → canonical status
const STATUS_MAP: Record<string, PurchaseStatus> = {
  approved: "approved",
  approved_with_delay: "approved",
  pending: "pending",
  pending_review: "pending",
  cancelled: "cancelled",
  canceled: "cancelled",
  refunded: "refunded",
  chargeback: "chargeback",
  expired: "expired",
  blocked: "cancelled",
 COMPROU_E_NAO_PAGOU: "pending",
};

// Hotmart event type normalization
const EVENT_TYPE_MAP: Record<string, string> = {
  "PURCHASE_APPROVED": "purchase.approved",
  "PURCHASE_COMPLETE": "purchase.approved",
  "PURCHASE_PENDING": "purchase.pending",
  "PURCHASE_CANCELLED": "purchase.cancelled",
  "PURCHASE_CANCELED": "purchase.cancelled",
  "PURCHASE_REFUNDED": "purchase.refunded",
  "PURCHASE_CHARGEBACK": "purchase.chargeback",
  "PURCHASE_EXPIRED": "purchase.expired",
  "SUBSCRIPTION_CANCELLED": "subscription.cancelled",
  "SUBSCRIPTION_CANCELED": "subscription.cancelled",
  "SUBSCRIPTION_RENEWED": "subscription.renewed",
  "SUBSCRIPTION_PAID": "subscription.paid",
  "LEAD_CREATED": "lead.created",
  "LEAD_CONFIRMED": "lead.confirmed",
};

class HotmartAdapter implements ProviderAdapter {
  readonly slug = "hotmart";

  /**
   * Validate Hotmart webhook.
   * Hotmart signs webhooks with HMAC-SHA256 in the X-Hub-Signature header.
   */
  async validateWebhook(
    headers: Record<string, string>,
    body: string,
    secret: string
  ): Promise<boolean> {
    const signature = headers["x-hub-signature"] || headers["X-Hub-Signature"];
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

      // Hotmart sends "sha256=<hash>" or just the hash
      const expected = signature.startsWith("sha256=")
        ? signature.slice(7)
        : signature;

      return computedHash === expected;
    } catch {
      return false;
    }
  }

  /**
   * Normalize Hotmart webhook payload to canonical format.
   * Hotmart v2 webhook structure:
   * { id, event, data: { product, buyer, purchase, ... } }
   */
  normalizePayload(payload: Record<string, unknown>): NormalizedEvent {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const product = (data.product ?? {}) as Record<string, unknown>;
    const buyer = (data.buyer ?? {}) as Record<string, unknown>;
    const purchase = (data.purchase ?? {}) as Record<string, unknown>;

    const rawEvent = (payload.event ?? payload.name ?? "unknown") as string;
    const rawStatus = (purchase.status ?? data.status ?? "") as string;

    return {
      provider: this.slug,
      externalEventId: this.extractEventId(payload),
      eventType: EVENT_TYPE_MAP[rawEvent] ?? rawEvent.toLowerCase(),
      purchaseStatus: this.mapStatus(rawStatus),
      externalProductId: String(product.id ?? data.product_id ?? ""),
      productName: (product.name ?? product.title ?? "") as string,
      buyer: {
        email: (buyer.email ?? "") as string,
        name: (buyer.name ?? buyer.first_name ?? "") as string,
        document: (buyer.document ?? buyer.cpf ?? "") as string,
      },
      amountCents: this.parseAmount(purchase.price?.value ?? data.price ?? 0),
      currency: (purchase.price?.currency ?? "BRL") as string,
      rawPayload: payload,
    };
  }

  extractEventId(payload: Record<string, unknown>): string {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const purchase = (data.purchase ?? {}) as Record<string, unknown>;
    return String(
      payload.id ??
      purchase.id ??
      data.transaction ??
      data.purchase_id ??
      crypto.randomUUID()
    );
  }

  mapStatus(rawStatus: string): PurchaseStatus {
    const normalized = rawStatus.toLowerCase().trim().replace(/\s+/g, "_");
    return STATUS_MAP[normalized] ?? "unknown";
  }

  /**
   * Test Hotmart API v2 connectivity.
   * Hotmart v2 uses OAuth2: first exchange client_id:client_secret for a token,
   * then test with a lightweight endpoint.
   *
   * Supports two credential formats:
   *   - "client_id:client_secret" → OAuth2 flow (recommended for v2)
   *   - "bearer_token" → direct Bearer (legacy v1 tokens)
   */
  async testCredentials(
    config: Record<string, string>,
    secret: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const baseUrl = (config.api_url || "https://api.hotmart.com").replace(/\/+$/, "");

      if (!secret) {
        return { ok: false, error: "Token não fornecido" };
      }

      let token = "";

      // If secret contains ":", treat as client_id:client_secret → OAuth2 flow
      if (secret.includes(":")) {
        const [clientId, clientSecret] = secret.split(":", 2);
        const basicAuth = btoa(`${clientId}:${clientSecret}`);

        const tokenRes = await fetch(`${baseUrl}/v2/auth/oauth/token`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          return { ok: false, error: `Falha ao obter token OAuth2 (${tokenRes.status}): ${errBody.slice(0, 200)}` };
        }

        const tokenData = await tokenRes.json() as { access_token?: string };
        token = tokenData.access_token ?? "";
        if (!token) {
          return { ok: false, error: "OAuth2 não retornou access_token" };
        }
      } else {
        // Direct Bearer token (legacy v1)
        token = secret;
      }

      // Test with a lightweight v2 endpoint
      const response = await fetch(`${baseUrl}/v2/product`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) return { ok: true };

      // 404/403 = auth worked, endpoint just doesn't exist or no permission → token is valid
      if (response.status === 404 || response.status === 403) {
        return { ok: true };
      }

      if (response.status === 401) {
        return { ok: false, error: "Credenciais inválidas ou expiradas" };
      }

      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    } catch (err) {
      return { ok: false, error: `Falha de conexão: ${(err as Error).message}` };
    }
  }

  private parseAmount(value: unknown): number {
    if (typeof value === "number") return Math.round(value * 100);
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : Math.round(num * 100);
  }
}

export const hotmartAdapter = new HotmartAdapter();
