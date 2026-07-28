// ============================================
// Edge Function: receive-integration-webhook
// ============================================
// Public webhook endpoint for receiving provider events.
// Validates signature, normalizes payload, processes business logic.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getProviderAdapter } from "../_shared/provider-registry.ts"
import { decryptSecret } from "../_shared/crypto.ts"
import type { NormalizedEvent } from "../_shared/integration-types.ts"

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function error(message: string, status = 400) {
  return json({ success: false, error: message }, status)
}

/**
 * Process a normalized event: match to product mapping and create registration/sales notification.
 */
async function processEvent(
  svcClient: ReturnType<typeof createClient>,
  event: NormalizedEvent,
  orgId: string,
  credentialId: string
): Promise<{ processed: boolean; reason?: string }> {

  // Only process purchase events that matter
  const actionableTypes = [
    "purchase.approved",
    "purchase.completed",
    "subscription.paid",
    "subscription.renewed",
  ]

  if (!actionableTypes.includes(event.eventType)) {
    return { processed: false, reason: `Event type '${event.eventType}' not actionable` }
  }

  // Find product mapping for this product
  const { data: mapping, error: mapErr } = await svcClient
    .from("integration_product_mappings")
    .select("id, webinar_id, auto_approve, settings")
    .eq("credential_id", credentialId)
    .eq("provider_slug", event.provider)
    .eq("external_product_id", event.externalProductId)
    .single()

  if (mapErr || !mapping) {
    return { processed: false, reason: `No product mapping for product_id=${event.externalProductId}` }
  }

  const webinarId = mapping.webinar_id
  const buyerEmail = event.buyer?.email
  const buyerName = event.buyer?.name || buyerEmail?.split("@")[0] || "Comprador"

  if (!buyerEmail) {
    return { processed: false, reason: "No buyer email in event" }
  }

  // Upsert registration (same email = same person)
  const { data: existingReg } = await svcClient
    .from("registrations")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("email", buyerEmail)
    .single()

  let registrationId: string

  if (existingReg) {
    // Update existing registration
    await svcClient
      .from("registrations")
      .update({ attended: mapping.auto_approve })
      .eq("id", existingReg.id)
    registrationId = existingReg.id
  } else {
    // Create new registration
    const { data: newReg, error: regErr } = await svcClient
      .from("registrations")
      .insert({
        webinar_id: webinarId,
        name: buyerName,
        email: buyerEmail,
        registered_at: new Date().toISOString(),
        attended: mapping.auto_approve,
      })
      .select("id")
      .single()

    if (regErr) {
      return { processed: false, reason: `Failed to create registration: ${regErr.message}` }
    }
    registrationId = newReg.id
  }

  // Create sales notification (proof social)
  await svcClient
    .from("sales_notifications")
    .insert({
      webinar_id: webinarId,
      buyer_name: buyerName,
      buyer_location: null,
      product_name: event.productName || "Produto",
      show_at_seconds: 0,
    })

  // Log analytics event
  await svcClient
    .from("analytics_events")
    .insert({
      webinar_id: webinarId,
      registration_id: registrationId,
      event_type: "integration.purchase",
      event_data: {
        provider: event.provider,
        external_event_id: event.externalEventId,
        product_id: event.externalProductId,
        amount_cents: event.amountCents,
        currency: event.currency,
        buyer_email: buyerEmail,
      },
    })

  return { processed: true }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return error("Method not allowed", 405)
  }

  try {
    // Extract provider from URL path
    // Hotmart webhook URL: https://<project>.supabase.co/functions/v1/receive-integration-webhook/hotmart
    const url = new URL(req.url)
    const pathParts = url.pathname.split("/").filter(Boolean)

    // Find provider slug: it's the last path segment
    // Path: /functions/v1/receive-integration-webhook/<provider_slug>
    let providerSlug = ""
    const webhookIdx = pathParts.indexOf("receive-integration-webhook")
    if (webhookIdx >= 0 && webhookIdx < pathParts.length - 1) {
      providerSlug = pathParts[webhookIdx + 1]
    } else {
      // Fallback: last segment
      providerSlug = pathParts[pathParts.length - 1] ?? ""
    }

    if (!providerSlug || providerSlug === "receive-integration-webhook") {
      return error("Missing provider slug in URL path. Use: /receive-integration-webhook/<provider>")
    }

    const adapter = getProviderAdapter(providerSlug)
    if (!adapter) {
      return error(`Unknown provider: ${providerSlug}`, 404)
    }

    // Read body
    const bodyText = await req.text()
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(bodyText)
    } catch {
      return error("Invalid JSON payload", 400)
    }

    // Service-role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const svcClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get provider ID
    const { data: provider } = await svcClient
      .from("integration_providers")
      .select("id")
      .eq("slug", providerSlug)
      .single()

    if (!provider) {
      return error(`Provider '${providerSlug}' not found in database`, 404)
    }

    // Find active credentials for this provider
    const { data: credentials } = await svcClient
      .from("integration_credentials")
      .select("id, org_id, secret_encrypted")
      .eq("status", "active")
      .eq("provider_id", provider.id)

    if (!credentials || credentials.length === 0) {
      console.log(`No active credentials for provider: ${providerSlug}`)
      return json({ success: true, message: "No active integrations" })
    }

    // Collect request headers for signature validation
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    let processedCount = 0
    let failedCount = 0

    for (const cred of credentials) {
      // Validate webhook signature if we have a secret
      if (cred.secret_encrypted) {
        try {
          const decryptedSecret = await decryptSecret(cred.secret_encrypted)
          const isValid = await adapter.validateWebhook(headers, bodyText, decryptedSecret)
          if (!isValid) {
            console.log(`Webhook validation failed for credential: ${cred.id}`)
            continue
          }
        } catch (decryptErr) {
          console.error(`Failed to decrypt/validate credential ${cred.id}:`, decryptErr)
          // Continue anyway — might be a test webhook without encryption
        }
      }

      // Extract event ID for idempotency
      const externalEventId = adapter.extractEventId(payload)

      // Check idempotency
      const { data: existingEvent } = await svcClient
        .from("integration_events")
        .select("id, status")
        .eq("provider_slug", providerSlug)
        .eq("external_event_id", externalEventId)
        .single()

      if (existingEvent) {
        console.log(`Duplicate event skipped: ${externalEventId}`)
        continue
      }

      // Normalize payload
      const normalized = adapter.normalizePayload(payload)

      // Store event (initially as "received")
      const { data: insertedEvent, error: insertErr } = await svcClient
        .from("integration_events")
        .insert({
          org_id: cred.org_id,
          credential_id: cred.id,
          provider_slug: providerSlug,
          external_event_id: externalEventId,
          event_type: normalized.eventType,
          payload: normalized.rawPayload,
          status: "received",
        })
        .select("id")
        .single()

      if (insertErr) {
        console.error(`Failed to store event: ${insertErr.message}`)
        failedCount++
        continue
      }

      // ─── Process the event (the actual business logic) ───
      try {
        const result = await processEvent(svcClient, normalized, cred.org_id, cred.id)

        // Update event status
        await svcClient
          .from("integration_events")
          .update({
            status: result.processed ? "processed" : "skipped",
            processed_at: new Date().toISOString(),
            error_message: result.reason ?? null,
          })
          .eq("id", insertedEvent.id)

        if (result.processed) {
          processedCount++
          console.log(`Event ${externalEventId} processed: registered buyer + sales notification`)
        } else {
          console.log(`Event ${externalEventId} skipped: ${result.reason}`)
        }
      } catch (processErr) {
        // Mark event as failed
        await svcClient
          .from("integration_events")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
            error_message: (processErr as Error).message,
          })
          .eq("id", insertedEvent.id)

        console.error(`Event processing failed:`, processErr)
        failedCount++
      }
    }

    return json({
      success: true,
      message: `Processed ${processedCount} event(s), skipped ${failedCount}`,
      provider: providerSlug,
    })
  } catch (err) {
    console.error("receive-integration-webhook error:", err)
    return error("Internal server error", 500)
  }
})
