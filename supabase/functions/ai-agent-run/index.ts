import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const AGENT_TYPES = new Set([
  "webinar_builder",
  "conversion_analyst",
  "integration_debugger",
  "follow_up",
])

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

async function requireOrgMember(
  supabase: ReturnType<typeof serviceClient>,
  token: string,
  orgId: string,
) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, profile: null, error: "Invalid token" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, user_id, org_id, role, display_name")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (!profile) return { user, profile: null, error: "Not a member of this organization" }
  return { user, profile, error: null }
}

function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets)
  if (!value || typeof value !== "object") return value

  const blocked = new Set([
    "secret",
    "token",
    "access_token",
    "refresh_token",
    "client_secret",
    "basic_token",
    "api_key",
    "hottok",
    "password",
  ])

  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!blocked.has(key.toLowerCase())) out[key] = stripSecrets(entry)
  }
  return out
}

function promptFor(agentType: string, context: Record<string, unknown>) {
  const base =
    "Você é um agente de IA do GabLive. Responda em português brasileiro, em JSON válido, com summary, recommendations e artifacts. Seja prático, específico e não invente dados."

  const instructions: Record<string, string> = {
    webinar_builder:
      "Crie uma estrutura de webinar com título, promessa, roteiro, CTAs, enquetes, mensagens simuladas e timeline sugerida.",
    conversion_analyst:
      "Analise gargalos de conversão do webinar com base em inscrições, eventos, CTAs, vendas e retenção. Sugira testes práticos.",
    integration_debugger:
      "Diagnostique integração Hotmart/Selflux. Foque em credenciais, status, webhooks, eventos sem mapeamento, product_id e próximos passos.",
    follow_up:
      "Segmente leads por comportamento e gere mensagens de WhatsApp/e-mail para follow-up sem promessas exageradas.",
  }

  return `${base}\n\nTarefa: ${instructions[agentType]}\n\nContexto JSON:\n${JSON.stringify(context, null, 2)}`
}

function fallbackOutput(agentType: string, context: Record<string, unknown>) {
  if (agentType === "integration_debugger") {
    return {
      summary: "Diagnóstico gerado com base nos dados disponíveis da integração.",
      recommendations: [
        "Confirme se a integração está ativa.",
        "Confirme se o webhook cadastrado no provider contém provider e org_id corretos.",
        "Verifique se o product_id recebido no webhook está mapeado para um webinar.",
        "Revise eventos recentes com status failed ou unmapped.",
      ],
      artifacts: [
        {
          type: "checklist",
          title: "Checklist de integração",
          content: [
            "Credenciais salvas",
            "Integração habilitada",
            "Webhook configurado no provider",
            "Hottok/webhook secret válido",
            "Produto/oferta mapeado para webinar",
          ],
        },
      ],
      context,
    }
  }

  return {
    summary: "Agente executado em modo local. Configure OPENAI_API_KEY para resposta generativa.",
    recommendations: [
      "Revise o contexto retornado.",
      "Execute novamente após haver mais dados no webinar.",
    ],
    artifacts: [
      {
        type: "note",
        title: "Resultado local",
        content: context,
      },
    ],
  }
}

async function callOpenAI(agentType: string, context: Record<string, unknown>) {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  if (!apiKey) return fallbackOutput(agentType, context)

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
      input: promptFor(agentType, context),
      text: {
        format: { type: "json_object" },
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI failed (${res.status}): ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data.output_text || data.output?.[0]?.content?.[0]?.text || ""
  try {
    return JSON.parse(text)
  } catch {
    return {
      summary: text || "Resposta gerada sem JSON estruturado.",
      recommendations: [],
      artifacts: [],
      raw: data,
    }
  }
}

async function buildContext(
  supabase: ReturnType<typeof serviceClient>,
  orgId: string,
  agentType: string,
  targetType: string,
  targetId: string,
  input: Record<string, unknown>,
) {
  const context: Record<string, unknown> = {
    agentType,
    targetType,
    targetId,
    input: stripSecrets(input || {}),
  }

  if (targetType === "webinar" && targetId) {
    const { data: webinar } = await supabase
      .from("webinars")
      .select("id, org_id, title, description, type, status, scheduled_at, slug")
      .eq("org_id", orgId)
      .eq("id", targetId)
      .maybeSingle()

    context.webinar = webinar || null

    if (webinar) {
      const [{ data: registrations }, { data: analyticsEvents }] = await Promise.all([
        supabase
          .from("registrations")
          .select("id, name, email, attended, registered_at, attended_at")
          .eq("webinar_id", webinar.id)
          .limit(100),
        supabase
          .from("analytics_events")
          .select("event_type, event_data, created_at")
          .eq("webinar_id", webinar.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ])
      context.registrations = registrations || []
      context.analyticsEvents = analyticsEvents || []
    }
  }

  if (agentType === "integration_debugger" || targetType === "integration") {
    const [{ data: integrations }, { data: mappings }, { data: webhookEvents }] = await Promise.all([
      supabase
        .from("org_sales_integrations")
        .select("provider, enabled, public_identifier, credentials_configured, webhook_secret_configured, last_tested_at, last_test_status, last_test_message")
        .eq("org_id", orgId),
      supabase
        .from("provider_product_mappings")
        .select("provider, webinar_id, provider_product_id, provider_offer_id, product_name, enabled")
        .eq("org_id", orgId)
        .limit(100),
      supabase
        .from("provider_webhook_events")
        .select("provider, event_type, product_id, offer_id, status, error_message, webinar_id, received_at")
        .eq("org_id", orgId)
        .order("received_at", { ascending: false })
        .limit(50),
    ])
    context.integrations = integrations || []
    context.mappings = mappings || []
    context.webhookEvents = webhookEvents || []
  }

  return stripSecrets(context) as Record<string, unknown>
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Unauthorized" }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON" }, 400)
  }

  const orgId = String(body.org_id || "")
  const agentType = String(body.agent_type || "")
  const targetType = String(body.target_type || "")
  const targetId = String(body.target_id || "")
  const input = (body.input || {}) as Record<string, unknown>

  if (!orgId) return json({ error: "org_id is required" }, 400)
  if (!AGENT_TYPES.has(agentType)) return json({ error: "unsupported agent_type" }, 400)

  const supabase = serviceClient()
  const token = authHeader.replace(/^Bearer\s+/i, "")
  const { user, profile, error } = await requireOrgMember(supabase, token, orgId)
  if (error || !user || !profile) {
    return json({ error: error || "Unauthorized" }, error?.includes("member") ? 403 : 401)
  }

  const { data: run, error: insertError } = await supabase
    .from("ai_agent_runs")
    .insert({
      org_id: orgId,
      agent_type: agentType,
      target_type: targetType || null,
      target_id: targetId || null,
      status: "running",
      input_context: stripSecrets(input),
      created_by: user.id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError || !run) {
    console.error("ai run insert", insertError)
    return json({ error: "Failed to create agent run" }, 500)
  }

  try {
    const context = await buildContext(supabase, orgId, agentType, targetType, targetId, input)
    const output = await callOpenAI(agentType, context)
    const artifacts = Array.isArray(output?.artifacts) ? output.artifacts : []

    await supabase
      .from("ai_agent_runs")
      .update({
        status: "completed",
        output,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)

    if (artifacts.length > 0) {
      await supabase.from("ai_agent_artifacts").insert(
        artifacts.map((artifact: Record<string, unknown>) => ({
          run_id: run.id,
          org_id: orgId,
          artifact_type: String(artifact.type || "note"),
          title: String(artifact.title || "Artefato"),
          content: artifact.content ?? {},
        })),
      )
    }

    return json({ ok: true, run: { ...run, status: "completed", output }, output })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent execution failed"
    await supabase
      .from("ai_agent_runs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)

    return json({ ok: false, run_id: run.id, error: message }, 500)
  }
})
