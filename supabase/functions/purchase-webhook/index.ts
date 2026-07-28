import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  isSupportedProvider,
  extractWebhookSecret,
  constantTimeEqual,
  normalizePayload,
  isApprovedPurchaseEvent,
} from "../_shared/provider-registry.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hotmart-hottok, x-webhook-secret, x-selflux-secret, x-api-key, x-gablive-webhook-secret",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Validate webhook secret against stored secrets for the provider.
 */
function validateWebhookAgainstStored(
  provider: string,
  provided: string | null,
  storedSecrets: Record<string, string> = {},
): { valid: boolean; reason: string } {
  if (!provided) return { valid: false, reason: "missing_webhook_secret" }

  if (provider === "hotmart") {
    const expected = storedSecrets.hottok || storedSecrets.webhook_secret
    if (!expected) return { valid: false, reason: "integration_not_configured" }
    return constantTimeEqual(provided, expected)
      ? { valid: true, reason: "ok" }
      : { valid: false, reason: "invalid_webhook_secret" }
  }

  if (provider === "selflux") {
    const candidates = [storedSecrets.webhook_secret, storedSecrets.api_key].filter(Boolean) as string[]
    if (candidates.length === 0) return { valid: false, reason: "integration_not_configured" }
    const ok = candidates.some((expected) => constantTimeEqual(provided, expected))
    return ok ? { valid: true, reason: "ok" } : { valid: false, reason: "invalid_webhook_secret" }
  }

  return { valid: false, reason: "unsupported_provider" }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const url = new URL(req.url)
  const provider = (url.searchParams.get("provider") || "").toLowerCase()
  const orgIdParam = url.searchParams.get("org_id") || url.searchParams.get("org")

  if (!isSupportedProvider(provider)) {
    return json({ error: "Unsupported provider. Use provider=hotmart|selflux" }, 400)
  }

  if (!orgIdParam) {
    return json({ error: "org_id query param is required" }, 400)
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const supabase = serviceClient()

  const { data: integration, error: intError } = await supabase
    .from("org_sales_integrations")
    .select("id, org_id, provider, enabled")
    .eq("org_id", orgIdParam)
    .eq("provider", provider)
    .maybeSingle()

  if (intError) {
    console.error("integration lookup error", intError)
    return json({ error: "Integration lookup failed" }, 500)
  }

  if (!integration || !integration.enabled) {
    return json({ error: "Integration not enabled for this organization" }, 403)
  }

  const { data: secretRow } = await supabase
    .from("org_sales_secrets")
    .select("secrets")
    .eq("integration_id", integration.id)
    .maybeSingle()

  const storedSecrets = (secretRow?.secrets || {}) as Record<string, string>

  // Extract webhook secret from request headers/body
  const headerRecord: Record<string, string> = {}
  req.headers.forEach((value, key) => { headerRecord[key] = value })
  const providedSecret = extractWebhookSecret(provider, headerRecord, payload)
  const validation = validateWebhookAgainstStored(provider, providedSecret, storedSecrets)

  if (!validation.valid) {
    return json({ error: "Unauthorized", reason: validation.reason }, 401)
  }

  // Normalize using the provider adapter
  const normalized = normalizePayload(provider, payload)
  if (!normalized) {
    await supabase.from("provider_webhook_events").insert({
      org_id: orgIdParam,
      provider,
      provider_event_id: `failed:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      event_type: "malformed",
      status: "failed",
      raw_payload: payload,
      error_message: "normalize_failed",
    })
    return json({ error: "Malformed payload", status: "failed" }, 422)
  }

  // Build a legacy provider_event_id for backward compatibility
  const providerEventId = [
    provider,
    normalized.externalEventId || "no-transaction",
    normalized.eventType || "event",
    normalized.purchaseStatus || "unknown",
  ].join(":")

  // Idempotency
  const { data: existing } = await supabase
    .from("provider_webhook_events")
    .select("id, status, webinar_id")
    .eq("org_id", orgIdParam)
    .eq("provider", provider)
    .eq("provider_event_id", providerEventId)
    .maybeSingle()

  if (existing) {
    return json({
      ok: true,
      duplicate: true,
      event_id: existing.id,
      status: existing.status,
      webinar_id: existing.webinar_id,
    })
  }

  let webinarId: string | null = null
  let mapStatus: "processed" | "unmapped" | "ignored" = "unmapped"
  const approved = isApprovedPurchaseEvent(normalized)

  if (normalized.externalProductId) {
    const { data: maps } = await supabase
      .from("provider_product_mappings")
      .select("id, webinar_id, provider_offer_id, enabled")
      .eq("org_id", orgIdParam)
      .eq("provider", provider)
      .eq("provider_product_id", normalized.externalProductId)
      .eq("enabled", true)

    if (maps && maps.length > 0) {
      const anyProduct = maps.find((m) => !m.provider_offer_id)
      webinarId = (anyProduct || maps[0])?.webinar_id || null
    }
  }

  if (!approved) {
    mapStatus = "ignored"
  } else if (webinarId) {
    mapStatus = "processed"
  } else {
    mapStatus = "unmapped"
  }

  const amount =
    normalized.amountCents != null ? Number(normalized.amountCents) / 100 : null

  const { data: inserted, error: insertError } = await supabase
    .from("provider_webhook_events")
    .insert({
      org_id: orgIdParam,
      webinar_id: webinarId,
      provider,
      provider_event_id: providerEventId,
      transaction_id: normalized.externalEventId || null,
      event_type: normalized.eventType,
      product_id: normalized.externalProductId || null,
      offer_id: null,
      buyer_email: normalized.buyer?.email || null,
      amount,
      currency: normalized.currency || "BRL",
      status: mapStatus,
      raw_payload: payload,
      error_message:
        mapStatus === "unmapped" ? "No product mapping for this product/offer" : null,
    })
    .select("id, status, webinar_id")
    .single()

  if (insertError) {
    if (insertError.code === "23505") {
      return json({ ok: true, duplicate: true })
    }
    console.error("insert webhook event error", insertError)
    return json({ error: "Failed to persist event" }, 500)
  }

  if (mapStatus === "processed" && webinarId && approved) {
    if (normalized.externalEventId) {
      await supabase.from("purchases").upsert(
        {
          org_id: orgIdParam,
          webinar_id: webinarId,
          provider,
          provider_transaction_id: normalized.externalEventId,
          buyer_email: normalized.buyer?.email || null,
          amount,
          currency: normalized.currency || "BRL",
          status: "approved",
          raw_payload: payload,
        },
        { onConflict: "org_id,provider,provider_transaction_id", ignoreDuplicates: true },
      )
    }

    await supabase.from("analytics_events").insert({
      webinar_id: webinarId,
      registration_id: null,
      event_type: "purchase",
      event_data: {
        provider,
        provider_event_id: providerEventId,
        transaction_id: normalized.externalEventId,
        product_id: normalized.externalProductId,
        buyer_email: normalized.buyer?.email,
        amount,
        currency: normalized.currency,
        source: "purchase-webhook",
      },
    })
  }

  return json({
    ok: true,
    event_id: inserted.id,
    status: inserted.status,
    webinar_id: inserted.webinar_id,
    duplicate: false,
  })
})
