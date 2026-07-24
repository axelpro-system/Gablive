import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * One-shot helper: ensure axelpro.com.br (or ?domain=) exists on Resend and return DNS records.
 * Secured with service_role JWT (or x-email-secret).
 */
serve(async (req) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Platform may already verify JWT; accept service_role claim or shared secret
  const auth = req.headers.get("Authorization") ?? ""
  const emailSecret = req.headers.get("x-email-secret")
  const configuredSecret = Deno.env.get("EMAIL_FUNCTION_SECRET")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const token = auth.replace(/^Bearer\s+/i, "").trim()

  let jwtRole: string | null = null
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""))
    jwtRole = typeof payload.role === "string" ? payload.role : null
  } catch {
    jwtRole = null
  }

  const ok =
    jwtRole === "service_role" ||
    (serviceKey.length > 0 && token === serviceKey) ||
    (Boolean(configuredSecret) && emailSecret === configuredSecret)
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized", jwtRole }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = new URL(req.url)
  const domainName = url.searchParams.get("domain") || "axelpro.com.br"
  const doVerify = url.searchParams.get("verify") === "1"

  const headers = {
    Authorization: `Bearer ${resendApiKey}`,
    "Content-Type": "application/json",
  }

  // List domains
  const listRes = await fetch("https://api.resend.com/domains", { headers })
  const listBody = await listRes.json()
  if (!listRes.ok) {
    return new Response(JSON.stringify({ error: "list_failed", detail: listBody }), {
      status: listRes.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  const domains = (listBody.data ?? listBody) as Array<Record<string, unknown>>
  let domain = domains.find((d) => d.name === domainName)

  if (!domain) {
    const createRes = await fetch("https://api.resend.com/domains", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: domainName }),
    })
    const createBody = await createRes.json()
    if (!createRes.ok) {
      return new Response(JSON.stringify({ error: "create_failed", detail: createBody }), {
        status: createRes.status,
        headers: { "Content-Type": "application/json" },
      })
    }
    domain = createBody
  }

  const domainId = domain.id as string

  // Fetch full domain details (records)
  const getRes = await fetch(`https://api.resend.com/domains/${domainId}`, { headers })
  const detail = await getRes.json()

  let verifyResult: unknown = null
  if (doVerify && domainId) {
    const vRes = await fetch(`https://api.resend.com/domains/${domainId}/verify`, {
      method: "POST",
      headers,
    })
    verifyResult = await vRes.json()
  }

  // Re-fetch after optional verify
  const get2 = await fetch(`https://api.resend.com/domains/${domainId}`, { headers })
  const detail2 = await get2.json()

  return new Response(
    JSON.stringify({
      email_from_should_be: `Gablive <contato@${domainName}>`,
      domain: detail2,
      verifyResult,
      listed_count: Array.isArray(domains) ? domains.length : 0,
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
