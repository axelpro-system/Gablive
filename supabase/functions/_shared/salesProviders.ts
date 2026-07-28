// Deno port of src/lib/salesProviders.js — keep semantics in sync with unit tests.

const APPROVED_STATUS = new Set(["approved", "purchase_approved", "completed", "paid"])

function cleanString(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function cleanLower(value: unknown): string {
  return cleanString(value).toLowerCase()
}

function toCents(value: unknown): number | null {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.round(number * 100)
}

function normalizeEventType(event: string, status: string): string {
  const rawEvent = cleanLower(event).replaceAll("-", "_").replaceAll(".", "_")
  const rawStatus = cleanLower(status).replaceAll("-", "_").replaceAll(".", "_")

  if (
    rawEvent.includes("approved") ||
    rawEvent.includes("paid") ||
    rawEvent.includes("completed") ||
    APPROVED_STATUS.has(rawStatus)
  ) {
    return "purchase_approved"
  }

  if (rawEvent.includes("cancel") || rawStatus.includes("cancel")) return "purchase_canceled"
  if (rawEvent.includes("refund") || rawStatus.includes("refund")) return "purchase_refunded"
  if (rawEvent.includes("chargeback") || rawStatus.includes("chargeback")) return "purchase_chargeback"

  return rawEvent || rawStatus || "purchase_event"
}

export type SalesProvider = "hotmart" | "selflux"

export function isSupportedSalesProvider(provider: string): provider is SalesProvider {
  return provider === "hotmart" || provider === "selflux"
}

export function buildProviderEventId({
  provider,
  transactionId,
  eventType,
  status,
}: {
  provider: string
  transactionId?: string
  eventType?: string
  status?: string
}): string {
  return [
    cleanLower(provider) || "unknown",
    cleanString(transactionId) || "no-transaction",
    cleanString(eventType) || "event",
    cleanLower(status) || "unknown",
  ].join(":")
}

export function validateProviderWebhookSecret({
  received,
  expected,
}: {
  received: string
  expected: string
}): boolean {
  const receivedValue = cleanString(received)
  const expectedValue = cleanString(expected)
  if (!receivedValue || !expectedValue) return false
  if (receivedValue.length !== expectedValue.length) return false

  let diff = 0
  for (let i = 0; i < receivedValue.length; i += 1) {
    diff |= receivedValue.charCodeAt(i) ^ expectedValue.charCodeAt(i)
  }
  return diff === 0
}

export function validateCredentialFields(
  provider: string,
  credentials: Record<string, string> = {},
): { ok: boolean; missing: string[] } {
  const c = credentials || {}
  const missing: string[] = []

  if (provider === "hotmart") {
    if (!cleanString(c.client_id)) missing.push("client_id")
    if (!cleanString(c.client_secret) && !cleanString(c.basic_token)) {
      missing.push("client_secret_or_basic_token")
    }
    if (!cleanString(c.hottok) && !cleanString(c.webhook_secret)) {
      missing.push("hottok")
    }
  } else if (provider === "selflux") {
    if (!cleanString(c.api_key)) missing.push("api_key")
    if (!cleanString(c.webhook_secret)) missing.push("webhook_secret")
  } else {
    return { ok: false, missing: ["provider"] }
  }

  return { ok: missing.length === 0, missing }
}

export function extractWebhookSecret(
  provider: string,
  headers: Headers,
  body: Record<string, unknown> = {},
): string | null {
  const get = (name: string) => headers.get(name) || headers.get(name.toLowerCase())

  if (provider === "hotmart") {
    return (
      get("X-HOTMART-HOTTOK") ||
      get("X-Hotmart-Hottok") ||
      get("hottok") ||
      (body.hottok as string) ||
      ((body.data as Record<string, unknown>)?.hottok as string) ||
      null
    )
  }

  if (provider === "selflux") {
    const auth = get("Authorization")
    return (
      get("X-Webhook-Secret") ||
      get("X-Selflux-Secret") ||
      get("X-Api-Key") ||
      (auth ? auth.replace(/^Bearer\s+/i, "") : null) ||
      (body.webhook_secret as string) ||
      (body.api_key as string) ||
      null
    )
  }

  return get("X-Gablive-Webhook-Secret")
}

export function validateWebhookAgainstStored(
  provider: string,
  provided: string | null,
  storedSecrets: Record<string, string> = {},
): { valid: boolean; reason: string } {
  if (!provided) return { valid: false, reason: "missing_webhook_secret" }

  if (provider === "hotmart") {
    const expected = storedSecrets.hottok || storedSecrets.webhook_secret
    if (!expected) return { valid: false, reason: "integration_not_configured" }
    return validateProviderWebhookSecret({ received: provided, expected })
      ? { valid: true, reason: "ok" }
      : { valid: false, reason: "invalid_webhook_secret" }
  }

  if (provider === "selflux") {
    const candidates = [storedSecrets.webhook_secret, storedSecrets.api_key].filter(Boolean) as string[]
    if (candidates.length === 0) return { valid: false, reason: "integration_not_configured" }
    const ok = candidates.some((expected) =>
      validateProviderWebhookSecret({ received: provided, expected }),
    )
    return ok ? { valid: true, reason: "ok" } : { valid: false, reason: "invalid_webhook_secret" }
  }

  return { valid: false, reason: "unsupported_provider" }
}

export interface NormalizedWebhook {
  provider: SalesProvider
  providerEventId: string
  transactionId: string
  eventType: string
  status: string
  productId: string
  productName: string
  buyerEmail: string
  buyerName: string
  amountCents: number | null
  currency: string
  rawPayload: unknown
}

export function normalizeHotmartWebhook(payload: Record<string, unknown> = {}): NormalizedWebhook {
  const data = (payload.data as Record<string, unknown>) || payload
  const purchase = (data.purchase as Record<string, unknown>) ||
    (data.purchase_data as Record<string, unknown>) ||
    {}
  const product = (data.product as Record<string, unknown>) || {}
  const buyer = (data.buyer as Record<string, unknown>) ||
    (data.customer as Record<string, unknown>) ||
    {}
  const event = cleanString(payload.event || payload.event_type || data.event)
  const status = cleanString(purchase.status || data.status || payload.status)
  const transactionId = cleanString(
    purchase.transaction || purchase.transaction_id || data.transaction || data.transaction_id,
  )
  const eventType = normalizeEventType(event, status)
  const price = purchase.price as Record<string, unknown> | undefined

  return {
    provider: "hotmart",
    providerEventId: buildProviderEventId({
      provider: "hotmart",
      transactionId,
      eventType: event || eventType,
      status,
    }),
    transactionId,
    eventType,
    status: cleanLower(status),
    productId: cleanString(product.id || data.product_id || data.productId),
    productName: cleanString(product.name || data.product_name || data.productName),
    buyerEmail: cleanLower(buyer.email || data.buyer_email || data.email),
    buyerName: cleanString(buyer.name || data.buyer_name || data.name),
    amountCents: toCents(price?.value ?? purchase.value ?? data.amount ?? data.price),
    currency: cleanString(price?.currency_code || data.currency || "BRL").toUpperCase(),
    rawPayload: payload,
  }
}

export function normalizeSelfluxWebhook(payload: Record<string, unknown> = {}): NormalizedWebhook {
  const customer = (payload.customer as Record<string, unknown>) ||
    (payload.buyer as Record<string, unknown>) ||
    (payload.client as Record<string, unknown>) ||
    {}
  const product = (payload.product as Record<string, unknown>) ||
    (payload.offer as Record<string, unknown>) ||
    {}
  const event = cleanString(payload.event || payload.event_type || payload.type)
  const status = cleanString(payload.status || payload.payment_status || payload.sale_status)
  const transactionId = cleanString(
    payload.transaction_id ||
      payload.transactionId ||
      payload.transaction ||
      payload.sale_id ||
      payload.order_id,
  )
  const eventType = normalizeEventType(event, status)

  return {
    provider: "selflux",
    providerEventId: buildProviderEventId({
      provider: "selflux",
      transactionId,
      eventType: event || eventType,
      status,
    }),
    transactionId,
    eventType,
    status: cleanLower(status),
    productId: cleanString(
      payload.offer_id || payload.product_id || payload.productId || product.id || product.offer_id,
    ),
    productName: cleanString(product.name || payload.product_name || payload.offer_name),
    buyerEmail: cleanLower(
      customer.email || payload.customer_email || payload.buyer_email || payload.email,
    ),
    buyerName: cleanString(
      customer.name || payload.customer_name || payload.buyer_name || payload.name,
    ),
    amountCents: toCents(payload.amount ?? payload.total ?? payload.price ?? payload.value),
    currency: cleanString(payload.currency || "BRL").toUpperCase(),
    rawPayload: payload,
  }
}

export function normalizeProviderWebhook(
  provider: SalesProvider,
  payload: Record<string, unknown>,
): NormalizedWebhook {
  if (provider === "hotmart") return normalizeHotmartWebhook(payload)
  return normalizeSelfluxWebhook(payload)
}

export function isApprovedPurchaseEvent(normalized: NormalizedWebhook): boolean {
  return normalized.eventType === "purchase_approved"
}
