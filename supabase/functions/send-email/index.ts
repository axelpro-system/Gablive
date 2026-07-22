import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface EmailPayload {
  to: string
  subject: string
  html: string
  from?: string
}

serve(async (req) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  const emailFrom = Deno.env.get("EMAIL_FROM") ?? "onboarding@resend.dev"

  let payload: EmailPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  const { to, subject, html, from } = payload
  if (!to || !subject || !html) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required fields: to, subject, html" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from ?? emailFrom,
      to: [to],
      subject,
      html,
    }),
  })

  const body = await res.json()

  if (!res.ok) {
    console.error("Resend error:", JSON.stringify(body))
    return new Response(
      JSON.stringify({ success: false, error: body }),
      { status: res.status, headers: { "Content-Type": "application/json" } },
    )
  }

  console.log(`Email sent to ${to}: ${subject} (id=${body.id})`)

  return new Response(
    JSON.stringify({ success: true, id: body.id }),
    { headers: { "Content-Type": "application/json" } },
  )
})
