// ============================================
// Edge Function: save-integration-config
// ============================================
// Authenticated endpoint to save/test integration credentials.
// Secrets are encrypted before storage and NEVER returned to the frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encryptSecret, decryptSecret } from "../_shared/crypto.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

function error(message: string, status = 400) {
  return json({ success: false, error: message }, status)
}

// ─── Provider adapter imports ────────────────────────────────────────────────

import { getProviderAdapter } from "../_shared/provider-registry.ts"

// ─── Auth ────────────────────────────────────────────────────────────────────

async function getOrgUser(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  const svcClient = createClient(supabaseUrl, supabaseServiceKey)
  const {
    data: { user },
    error: authError,
  } = await svcClient.auth.getUser(token)

  if (authError || !user) return null

  // Get org membership
  const { data: profile } = await svcClient
    .from("profiles")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!profile || profile.role !== "admin") return null

  return { userId: user.id, orgId: profile.org_id }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /save-integration-config
 *
 * Body:
 * {
 *   provider_slug: string,
 *   label?: string,
 *   config: { api_url: string, [key: string]: string },
 *   secret?: string,  // plaintext — encrypted before storage, never returned
 *   action: "save" | "test" | "save_and_test"
 * }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // Auth
  const authHeader = req.headers.get("Authorization")
  const orgUser = await getOrgUser(authHeader ?? "")
  if (!orgUser) {
    return error("Unauthorized — admin access required", 401)
  }

  try {
    const body = await req.json()
    const {
      provider_slug,
      label = "",
      config = {},
      secret,
      action = "save",
    } = body as {
      provider_slug: string
      label?: string
      config?: Record<string, string>
      secret?: string
      action?: "save" | "test" | "save_and_test"
    }

    if (!provider_slug) {
      return error("Missing required field: provider_slug")
    }

    // Validate provider exists
    const adapter = getProviderAdapter(provider_slug)
    if (!adapter) {
      return error(`Unknown provider: ${provider_slug}`)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const svcClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get provider ID
    const { data: provider, error: providerErr } = await svcClient
      .from("integration_providers")
      .select("id")
      .eq("slug", provider_slug)
      .single()

    if (providerErr || !provider) {
      return error(`Provider not found in database: ${provider_slug}`, 404)
    }

    // ─── Test action ────────────────────────────────────────────────────────
    let testResult: { ok: boolean; error?: string } | null = null
    if (action === "test" || action === "save_and_test") {
      if (adapter.testCredentials) {
        testResult = await adapter.testCredentials(config, secret ?? "")
      } else {
        testResult = { ok: true } // No test available, assume ok
      }
    }

    // ─── Save action ────────────────────────────────────────────────────────
    let savedCredential: Record<string, unknown> | null = null
    if (action === "save" || action === "save_and_test") {
      // Encrypt secret before storage
      const encryptedSecret = secret
        ? await encryptSecret(secret)
        : null

      // Upsert: one credential per org + provider + label
      const { data: existing } = await svcClient
        .from("integration_credentials")
        .select("id")
        .eq("org_id", orgUser.orgId)
        .eq("provider_id", provider.id)
        .eq("label", label)
        .single()

      const updateData: Record<string, unknown> = {
        config,
        status: testResult
          ? testResult.ok
            ? "active"
            : "error"
          : "inactive",
        last_tested_at: testResult ? new Date().toISOString() : null,
        last_test_error: testResult && !testResult.ok ? testResult.error : null,
        updated_at: new Date().toISOString(),
      }

      // Only update secret if provided
      if (encryptedSecret) {
        updateData.secret_encrypted = encryptedSecret
      }

      let credentialId: string

      if (existing) {
        // Update existing
        const { data: updated, error: updateErr } = await svcClient
          .from("integration_credentials")
          .update(updateData)
          .eq("id", existing.id)
          .select("id, org_id, provider_id, label, config, status, last_tested_at, created_at, updated_at")
          .single()

        if (updateErr) return error(updateErr.message, 500)
        savedCredential = updated
        credentialId = existing.id
      } else {
        // Insert new
        const insertData: Record<string, unknown> = {
          org_id: orgUser.orgId,
          provider_id: provider.id,
          label,
          config,
          status: testResult
            ? testResult.ok
              ? "active"
              : "error"
            : "inactive",
          last_tested_at: testResult ? new Date().toISOString() : null,
          last_test_error: testResult && !testResult.ok ? testResult.error : null,
        }
        if (encryptedSecret) {
          insertData.secret_encrypted = encryptedSecret
        }

        const { data: inserted, error: insertErr } = await svcClient
          .from("integration_credentials")
          .insert(insertData)
          .select("id, org_id, provider_id, label, config, status, last_tested_at, created_at, updated_at")
          .single()

        if (insertErr) return error(insertErr.message, 500)
        savedCredential = inserted
        credentialId = inserted.id
      }
    }

    // ─── Response (NEVER includes secret_encrypted) ─────────────────────────
    return json({
      success: true,
      data: {
        credential: savedCredential,
        test: testResult,
      },
    })
  } catch (err) {
    console.error("save-integration-config error:", err)
    return error("Internal server error", 500)
  }
})
