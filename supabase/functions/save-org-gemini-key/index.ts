// ============================================
// Edge Function: save-org-gemini-key
// ============================================
// Encrypts the org's Gemini API key before storing it in
// organizations.settings — previously saved as plaintext directly
// from the client via SettingsPage.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encryptSecret } from "../_shared/crypto.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

function fail(message: string, status = 400) {
  return json({ success: false, error: message }, status)
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== "POST") return fail("Method not allowed", 405)

  const authHeader = req.headers.get("Authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) return fail("Unauthorized", 401)

  const supabase = serviceClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) return fail("Unauthorized", 401)

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("user_id", user.id)
    .single()

  if (!profile?.org_id) return fail("Unauthorized", 401)

  try {
    const body = await req.json() as Record<string, unknown>
    const apiKey = String(body.api_key ?? "").trim()

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", profile.org_id)
      .single()

    if (orgError || !org) return fail("Organization not found", 404)

    const settings = { ...(org.settings || {}) } as Record<string, unknown>
    delete settings.gemini_api_key // drop any legacy plaintext value

    if (apiKey) {
      settings.gemini_api_key_encrypted = await encryptSecret(apiKey)
    } else {
      delete settings.gemini_api_key_encrypted
    }

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ settings })
      .eq("id", profile.org_id)

    if (updateError) return fail(updateError.message, 500)

    return json({ success: true, configured: Boolean(apiKey) })
  } catch (error) {
    console.error("save-org-gemini-key error:", error)
    return fail(error instanceof Error ? error.message : "Internal server error", 500)
  }
})
