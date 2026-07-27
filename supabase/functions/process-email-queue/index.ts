import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { nextEmailQueueStateAfterAttempt } from "../_shared/emailQueueRetry.ts"
import { buildResendEmailPayload } from "../_shared/emailTemplates.ts"

const PUBLIC_APP_URL_FALLBACK =
  Deno.env.get("PUBLIC_APP_URL") ??
  Deno.env.get("SITE_URL") ??
  ""

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

  // Optional Resend hosted template aliases (Dashboard → Templates)
  const resendTemplateByType: Record<string, string | undefined> = {
    confirmation: Deno.env.get("RESEND_TEMPLATE_CONFIRMATION") || undefined,
    reminder: Deno.env.get("RESEND_TEMPLATE_REMINDER") || undefined,
    replay: Deno.env.get("RESEND_TEMPLATE_REPLAY") || undefined,
  }

  const { data: queue, error: fetchError } = await supabaseClient
    .from("email_queue")
    .select(
      "*, email_configs(*), registrations(*, webinars(id, title, slug))",
    )
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
  let requeued = 0

  for (const item of queue) {
    const registration = item.registrations as Record<string, unknown> | undefined
    const config = item.email_configs as Record<string, unknown> | undefined
    const webinar = registration?.webinars as
      | Record<string, unknown>
      | undefined

    const to = registration?.email as string | undefined
    const name = (registration?.name as string | undefined) ?? ""
    const email = to ?? ""
    const webinarTitle = (webinar?.title as string | undefined) ?? "Webinário"
    const slug = (webinar?.slug as string | undefined) ?? ""
    const type = (config?.type as string | undefined) ?? "confirmation"

    // Prefer origin captured at registration; never invent a marketing domain
    const rawBase =
      (item.app_base_url as string | undefined) ||
      PUBLIC_APP_URL_FALLBACK ||
      ""
    const base = rawBase.replace(/\/$/, "")
    if (!base || !slug) {
      console.warn(
        `Queue ${item.id}: missing app_base_url or slug (base=${base}, slug=${slug})`,
      )
    }
    // Token de acesso cross-device: o link do e-mail carrega o registration_id
    // como ?reg=<id>, para a sala de espera/sala funcionarem em outro aparelho
    // (sem localStorage). Consumido por WaitRoomPage/useRegistration.
    const regId = item.registration_id as string | undefined
    const regQ = regId ? `?reg=${regId}` : ""
    const vars = {
      name,
      email,
      webinar_title: webinarTitle,
      wait_url: base && slug ? `${base}/wait/${slug}${regQ}` : base || "",
      room_url: base && slug ? `${base}/room/${slug}${regQ}` : base || "",
      replay_url: base && slug ? `${base}/replay/${slug}${regQ}` : base || "",
    }

    if (!to) {
      await supabaseClient
        .from("email_queue")
        .update({
          status: "failed",
          error: "Missing registration email",
          attempts: (item.attempts ?? 0) + 1,
        })
        .eq("id", item.id)
      failed++
      continue
    }

    const { subject, html } = buildResendEmailPayload({
      type,
      subject: config?.subject as string | undefined,
      bodyHtml: config?.body_html as string | undefined,
      vars,
    })

    const hostedTemplateId = resendTemplateByType[type]

    try {
      const payload: Record<string, unknown> = {
        from: emailFrom,
        to: [to],
      }

      if (hostedTemplateId) {
        // Resend Dashboard templates (published id or alias)
        payload.template = {
          id: hostedTemplateId,
          variables: {
            NAME: vars.name,
            WEBINAR_TITLE: vars.webinar_title,
            WAIT_URL: vars.wait_url,
            ROOM_URL: vars.room_url,
            REPLAY_URL: vars.replay_url,
            EMAIL: vars.email,
          },
        }
      } else {
        payload.subject = subject
        payload.html = html
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(JSON.stringify(body))
      }

      const next = nextEmailQueueStateAfterAttempt({
        attempts: item.attempts ?? 0,
        success: true,
      })

      await supabaseClient
        .from("email_queue")
        .update({
          status: next.status,
          attempts: next.attempts,
          sent_at: next.sent_at,
          error: null,
        })
        .eq("id", item.id)

      console.log(
        `Email sent to ${to}: ${hostedTemplateId ? `template=${hostedTemplateId}` : subject} (id=${body.id})`,
      )
      sent++
    } catch (err) {
      console.error(`Failed to send email to ${to}:`, err)
      const errMsg = err instanceof Error ? err.message : "Unknown error"

      // Permanent Resend validation errors: do not burn retry budget / delay forever
      const permanent =
        /only send testing emails|verify a domain|invalid.*from|domain is not verified/i
          .test(errMsg)

      const next = permanent
        ? {
          status: "failed" as const,
          attempts: (item.attempts ?? 0) + 1,
          error: errMsg,
          scheduled_at: null as string | null,
        }
        : nextEmailQueueStateAfterAttempt({
          attempts: item.attempts ?? 0,
          success: false,
          errorMessage: errMsg,
        })

      const patch: Record<string, unknown> = {
        status: next.status,
        attempts: next.attempts,
        error: next.error,
      }
      if (next.scheduled_at) {
        patch.scheduled_at = next.scheduled_at
      }

      await supabaseClient
        .from("email_queue")
        .update(patch)
        .eq("id", item.id)

      if (next.status === "pending") {
        requeued++
      } else {
        failed++
      }
    }
  }

  return new Response(
    JSON.stringify({ processed: queue.length, sent, failed, requeued }),
    { headers: { "Content-Type": "application/json" } },
  )
})
