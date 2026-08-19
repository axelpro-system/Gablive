import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  isSupportedProvider,
  validateCredentials,
} from "../_shared/provider-registry.ts"
import { decryptSecretsObject, encryptSecretsObject } from "../_shared/crypto.ts"

type SalesProvider = "hotmart" | "selflux"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

type ServiceClient = ReturnType<typeof createClient>
type Credentials = Record<string, string>

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

async function getOrgUser(authHeader: string) {
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  const supabase = serviceClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!profile?.org_id) return null
  return { userId: user.id, orgId: profile.org_id as string, role: profile.role as string }
}

function compactCredentials(input: unknown): Credentials {
  const credentials = (input || {}) as Record<string, unknown>
  const clean: Credentials = {}
  for (const [key, value] of Object.entries(credentials)) {
    const text = String(value ?? "").trim()
    if (text) clean[key] = text
  }
  if (clean.basic_token) {
    clean.basic_token = clean.basic_token.replace(/^Basic\s+/i, "").trim()
  }
  return clean
}

async function getIntegration(
  supabase: ServiceClient,
  orgId: string,
  provider: SalesProvider,
) {
  const { data, error } = await supabase
    .from("org_sales_integrations")
    .select("*")
    .eq("org_id", orgId)
    .eq("provider", provider)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

async function getSecrets(
  supabase: ServiceClient,
  integrationId?: string,
): Promise<Credentials> {
  if (!integrationId) return {}
  const { data, error } = await supabase
    .from("org_sales_secrets")
    .select("secrets")
    .eq("integration_id", integrationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const decrypted = await decryptSecretsObject(data?.secrets as Record<string, unknown>)
  return compactCredentials(decrypted)
}

function publicIdentifier(provider: SalesProvider, secrets: Credentials) {
  if (provider === "hotmart") return secrets.client_id || null
  if (provider === "selflux") return secrets.api_key ? "api_key_configured" : null
  return null
}

async function listIntegrations(supabase: ServiceClient, orgId: string) {
  const { data, error } = await supabase
    .from("org_sales_integrations")
    .select("*")
    .eq("org_id", orgId)
    .order("provider")

  if (error) return { integrations: [], error: error.message }
  return { integrations: data || [] }
}

async function saveIntegration(
  supabase: ServiceClient,
  orgId: string,
  provider: SalesProvider,
  body: Record<string, unknown>,
) {
  const incoming = compactCredentials(body.credentials)
  const existing = await getIntegration(supabase, orgId, provider)
  const previousSecrets = await getSecrets(supabase, existing?.id)
  const mergedSecrets = { ...previousSecrets, ...incoming }
  const validation = validateCredentials(provider, mergedSecrets)
  const now = new Date().toISOString()

  const integrationPayload = {
    org_id: orgId,
    provider,
    enabled: Boolean(body.enabled ?? existing?.enabled ?? true),
    public_identifier: publicIdentifier(provider, mergedSecrets),
    credentials_configured: validation.ok,
    webhook_secret_configured: Boolean(
      mergedSecrets.hottok || mergedSecrets.webhook_secret,
    ),
    updated_at: now,
  }

  const { data: integration, error } = existing?.id
    ? await supabase
      .from("org_sales_integrations")
      .update(integrationPayload)
      .eq("id", existing.id)
      .select("*")
      .single()
    : await supabase
      .from("org_sales_integrations")
      .insert({
        ...integrationPayload,
        created_at: now,
      })
      .select("*")
      .single()

  if (error) return { error: error.message }

  if (Object.keys(incoming).length > 0) {
    const { error: secretError } = await supabase
      .from("org_sales_secrets")
      .upsert({
        integration_id: integration.id,
        org_id: orgId,
        provider,
        secrets: await encryptSecretsObject(mergedSecrets),
        updated_at: now,
      }, { onConflict: "integration_id" })

    if (secretError) return { error: secretError.message }
  }

  return {
    success: true,
    integration,
    configured: validation.ok,
    missing: validation.missing,
  }
}

async function getHotmartAccessToken(secrets: Credentials) {
  const clientId = secrets.client_id
  const clientSecret = secrets.client_secret
  const basicToken = secrets.basic_token

  if (!clientId && !clientSecret && !basicToken) {
    return { token: "", error: "Credenciais Hotmart ausentes" }
  }

  const authHeader = basicToken
    ? `Basic ${basicToken}`
    : `Basic ${btoa(`${clientId}:${clientSecret}`)}`

  const authUrls = [
    "https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials",
    "https://api.hotmart.com/v2/auth/oauth/token",
  ]

  let lastError = ""
  for (const url of authUrls) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    if (response.ok) {
      const data = await response.json() as { access_token?: string }
      if (data.access_token) return { token: data.access_token, error: "" }
      lastError = "Hotmart auth não retornou access_token"
      continue
    }

    const body = await response.text()
    lastError = `Hotmart auth failed (${response.status}): ${body.slice(0, 250)}`
  }

  return { token: "", error: lastError || "Hotmart auth failed" }
}

async function testIntegration(
  supabase: ServiceClient,
  orgId: string,
  provider: SalesProvider,
) {
  const integration = await getIntegration(supabase, orgId, provider)
  if (!integration) return { ok: false, message: "Credenciais não salvas" }

  const secrets = await getSecrets(supabase, integration.id)
  const validation = validateCredentials(provider, secrets)
  let ok = validation.ok
  let message = ok ? "Credenciais configuradas" : `Campos ausentes: ${validation.missing.join(", ")}`

  if (ok && provider === "hotmart") {
    const auth = await getHotmartAccessToken(secrets)
    ok = Boolean(auth.token)
    message = ok ? "Hotmart autenticou com sucesso" : auth.error
  }

  if (ok && provider === "selflux") {
    message = "Selflux configurado para receber webhooks"
  }

  const { data: updated } = await supabase
    .from("org_sales_integrations")
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_status: ok ? "success" : "failed",
      last_test_message: message,
      credentials_configured: validation.ok,
      webhook_secret_configured: Boolean(secrets.hottok || secrets.webhook_secret),
    })
    .eq("id", integration.id)
    .select("*")
    .single()

  return { ok, message, integration: updated || integration }
}

async function setEnabled(
  supabase: ServiceClient,
  orgId: string,
  provider: SalesProvider,
  enabled: boolean,
) {
  const { data, error } = await supabase
    .from("org_sales_integrations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("provider", provider)
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { success: true, integration: data }
}

async function fetchHotmartProducts(secrets: Credentials) {
  const auth = await getHotmartAccessToken(secrets)
  if (!auth.token) return { products: [], error: auth.error }

  const endpoints = [
    "https://api-hot-connect.hotmart.com/products/api/v1/products",
    "https://api-hot-connect.hotmart.com/product/rest/v2/products",
    "https://api.hotmart.com/v2/product",
  ]

  let lastError = ""
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const body = await response.text()
      lastError = `Hotmart products failed (${response.status}): ${body.slice(0, 250)}`
      continue
    }

    const payload = await response.json() as Record<string, unknown>
    const rawProducts =
      (payload.items as Array<Record<string, unknown>>) ||
      (payload.products as Array<Record<string, unknown>>) ||
      (payload.content as Array<Record<string, unknown>>) ||
      (Array.isArray(payload) ? payload as Array<Record<string, unknown>> : [])

    const products = rawProducts
      .map((product) => ({
        id: String(product.id ?? product.product_id ?? product.ucode ?? product.productId ?? ""),
        ucode: String(product.ucode ?? product.id ?? product.product_id ?? ""),
        name: String(product.name ?? product.product_name ?? product.title ?? "Sem nome"),
        status: String(product.status ?? product.product_status ?? "active"),
      }))
      .filter((product) => product.id)

    return { products }
  }

  return { products: [], error: lastError || "Hotmart products failed" }
}

async function listProducts(
  supabase: ServiceClient,
  orgId: string,
  provider: SalesProvider,
) {
  const integration = await getIntegration(supabase, orgId, provider)
  if (!integration) return { products: [], error: "Credenciais não salvas" }
  if (!integration.credentials_configured) {
    return { products: [], error: "Credenciais incompletas" }
  }

  const secrets = await getSecrets(supabase, integration.id)
  if (provider === "selflux") {
    return { products: [], message: "Selflux: preencha o Product ID manualmente por enquanto" }
  }

  return await fetchHotmartProducts(secrets)
}

async function listMappings(
  supabase: ServiceClient,
  orgId: string,
  provider?: string,
) {
  let query = supabase
    .from("provider_product_mappings")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (provider && isSupportedProvider(provider)) query = query.eq("provider", provider)

  const { data, error } = await query
  if (error) return { mappings: [], error: error.message }
  return { mappings: data || [] }
}

async function createMapping(
  supabase: ServiceClient,
  orgId: string,
  body: Record<string, unknown>,
) {
  const provider = String(body.provider || "")
  if (!isSupportedProvider(provider)) return { error: "Provider inválido" }

  const { data, error } = await supabase
    .from("provider_product_mappings")
    .insert({
      org_id: orgId,
      provider,
      webinar_id: body.webinar_id,
      provider_product_id: body.provider_product_id,
      provider_offer_id: body.provider_offer_id || null,
      product_name: body.product_name || null,
      enabled: body.enabled ?? true,
      conversion_events: body.conversion_events ?? ["purchase_approved"],
    })
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { mapping: data }
}

async function updateMapping(
  supabase: ServiceClient,
  orgId: string,
  mappingId: string,
  patch: Record<string, unknown>,
) {
  const allowed: Record<string, unknown> = {}
  if (typeof patch.enabled === "boolean") allowed.enabled = patch.enabled
  if (typeof patch.product_name === "string") allowed.product_name = patch.product_name
  if (Array.isArray(patch.conversion_events)) allowed.conversion_events = patch.conversion_events

  if (Object.keys(allowed).length === 0) return { error: "No valid fields to update" }
  allowed.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("provider_product_mappings")
    .update(allowed)
    .eq("id", mappingId)
    .eq("org_id", orgId)
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { mapping: data }
}

async function deleteMapping(
  supabase: ServiceClient,
  orgId: string,
  mappingId: string,
) {
  const { error } = await supabase
    .from("provider_product_mappings")
    .delete()
    .eq("id", mappingId)
    .eq("org_id", orgId)

  if (error) return { error: error.message }
  return { success: true }
}

async function listEvents(
  supabase: ServiceClient,
  orgId: string,
  limit = 20,
) {
  const { data, error } = await supabase
    .from("provider_webhook_events")
    .select("*")
    .eq("org_id", orgId)
    .order("received_at", { ascending: false })
    .limit(limit)

  if (error) return { events: [], error: error.message }
  return { events: data || [] }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== "POST") return fail("Method not allowed", 405)

  const authHeader = req.headers.get("Authorization")
  const orgUser = await getOrgUser(authHeader ?? "")
  if (!orgUser) return fail("Unauthorized", 401)

  try {
    const body = await req.json() as Record<string, unknown>
    const action = String(body.action || "")
    const requestedProvider = String(body.provider || "")
    const provider = isSupportedProvider(requestedProvider)
      ? requestedProvider
      : null
    const targetOrgId = String(body.org_id || orgUser.orgId)

    if (targetOrgId !== orgUser.orgId && orgUser.role !== "admin") {
      return fail("Cannot access other org's data", 403)
    }

    const supabase = serviceClient()

    switch (action) {
      case "list_integrations":
        return json(await listIntegrations(supabase, targetOrgId))

      case "save":
        if (!provider) return fail("Provider inválido")
        return json(await saveIntegration(supabase, targetOrgId, provider, body))

      case "test":
        if (!provider) return fail("Provider inválido")
        return json(await testIntegration(supabase, targetOrgId, provider))

      case "set_enabled":
        if (!provider) return fail("Provider inválido")
        return json(await setEnabled(supabase, targetOrgId, provider, Boolean(body.enabled)))

      case "list_products":
        if (!provider) return fail("Provider inválido")
        return json(await listProducts(supabase, targetOrgId, provider))

      case "list_mappings":
        return json(await listMappings(supabase, targetOrgId, requestedProvider))

      case "create_mapping":
        return json(await createMapping(supabase, targetOrgId, body))

      case "update_mapping":
        return json(await updateMapping(
          supabase,
          targetOrgId,
          String(body.mapping_id || ""),
          (body.patch || {}) as Record<string, unknown>,
        ))

      case "delete_mapping":
        return json(await deleteMapping(supabase, targetOrgId, String(body.mapping_id || "")))

      case "list_events":
        return json(await listEvents(supabase, targetOrgId, Number(body.limit || 20)))

      default:
        return fail(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error("manage-sales-integration error:", error)
    return fail(error instanceof Error ? error.message : "Internal server error", 500)
  }
})
