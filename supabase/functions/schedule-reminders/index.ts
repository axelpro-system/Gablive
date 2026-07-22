import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface Webinar {
  id: string
  title: string
  slug: string
  scheduled_at: string
}

interface EmailConfig {
  id: string
  webinar_id: string
  type: string
  subject: string
  body_html: string
  send_before_minutes: number | null
  enabled: boolean
}

interface Registration {
  id: string
  webinar_id: string
  email: string
  name: string
}

serve(async (_req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  )

  const now = new Date().toISOString()

  // Find enabled reminder email configs with their webinars
  const { data: configs, error: configError } = await supabaseClient
    .from("email_configs")
    .select("*, webinars!inner(*)")
    .eq("type", "reminder")
    .eq("enabled", true)
    .not("send_before_minutes", "is", null)
    .gte("webinars.scheduled_at", now)

  if (configError) {
    console.error("Error fetching email configs:", configError)
    return new Response(
      JSON.stringify({ error: configError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  if (!configs || configs.length === 0) {
    return new Response(
      JSON.stringify({ message: "No reminder configs to process" }),
      { headers: { "Content-Type": "application/json" } },
    )
  }

  let scheduled = 0
  let skipped = 0

  for (const cfg of configs) {
    const config = cfg as unknown as EmailConfig & { webinars: Webinar }
    const webinar = config.webinars

    // Calculate when to send: scheduled_at - send_before_minutes
    const sendAt = new Date(
      new Date(webinar.scheduled_at).getTime() - (config.send_before_minutes ?? 0) * 60 * 1000,
    )

    // Skip if the send time has already passed
    if (sendAt <= new Date()) {
      skipped++
      continue
    }

    // Fetch registrations for this webinar
    const { data: registrations } = await supabaseClient
      .from("registrations")
      .select("id, webinar_id, email, name")
      .eq("webinar_id", webinar.id)

    if (!registrations || registrations.length === 0) {
      skipped++
      continue
    }

    for (const reg of registrations) {
      // Check if queue entry already exists (avoid duplicates)
      const { data: existing } = await supabaseClient
        .from("email_queue")
        .select("id")
        .eq("email_config_id", config.id)
        .eq("registration_id", reg.id)
        .eq("status", "pending")
        .maybeSingle()

      if (existing) {
        continue
      }

      const { error: insertError } = await supabaseClient
        .from("email_queue")
        .insert({
          email_config_id: config.id,
          registration_id: reg.id,
          scheduled_at: sendAt.toISOString(),
          status: "pending",
        })

      if (insertError) {
        console.error(`Error inserting queue for ${reg.email}:`, insertError)
      } else {
        scheduled++
      }
    }
  }

  return new Response(
    JSON.stringify({
      message: "Reminders scheduled",
      configs_processed: configs.length,
      scheduled,
      skipped_out_of_range: skipped,
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
