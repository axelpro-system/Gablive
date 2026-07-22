import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (_req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  )

  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured")
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  const emailFrom = Deno.env.get("EMAIL_FROM") ?? "onboarding@resend.dev"

  // Fetch pending emails from queue with config and registration data
  const { data: queue, error: fetchError } = await supabaseClient
    .from("email_queue")
    .select("*, email_configs(*), registrations(*)")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50)

  if (fetchError) {
    console.error("Error fetching queue:", fetchError)
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  if (!queue || queue.length === 0) {
    return new Response(
      JSON.stringify({ message: "No emails to process" }),
      { headers: { "Content-Type": "application/json" } },
    )
  }

  let sent = 0
  let failed = 0

  for (const item of queue) {
    const registration = item.registrations as Record<string, unknown> | undefined
    const config = item.email_configs as Record<string, unknown> | undefined

    const to = registration?.email as string | undefined
    const subject = config?.subject as string | undefined
    const html = config?.body_html as string | undefined

    if (!to || !subject || !html) {
      console.warn(`Skipping queue item ${item.id}: missing email data`)
      await supabaseClient
        .from("email_queue")
        .update({ status: "failed", error: "Missing email data (to, subject, or html)" })
        .eq("id", item.id)
      failed++
      continue
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [to],
          subject,
          html,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(JSON.stringify(body))
      }

      await supabaseClient
        .from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id)

      console.log(`Email sent to ${to}: ${subject} (id=${body.id})`)
      sent++
    } catch (err) {
      console.error(`Failed to send email to ${to}:`, err)
      await supabaseClient
        .from("email_queue")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", item.id)
      failed++
    }
  }

  return new Response(
    JSON.stringify({ processed: queue.length, sent, failed }),
    { headers: { "Content-Type": "application/json" } },
  )
})
