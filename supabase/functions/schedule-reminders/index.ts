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

const INSERT_MAX_ATTEMPTS = 3
const INSERT_RETRY_DELAY_MS = 300

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retries a queue insert on transient failure. Without this, a single
 * dropped DB connection during the send window silently loses that
 * reminder forever — the next cron run sees sendAt in the past and
 * skips it (see the `sendAt <= new Date()` check below).
 */
async function insertQueueEntryWithRetry(
  supabaseClient: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  let lastError: { message: string } | null = null

  for (let attempt = 1; attempt <= INSERT_MAX_ATTEMPTS; attempt++) {
    const { error } = await supabaseClient.from("email_queue").insert(payload)
    if (!error) return { error: null }

    lastError = error
    if (attempt < INSERT_MAX_ATTEMPTS) {
      await sleep(INSERT_RETRY_DELAY_MS * attempt)
    }
  }

  return { error: lastError }
}

serve(async (_req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  )

  const now = new Date().toISOString()

  // Find enabled reminder and replay email configs with their webinars
  const { data: configs, error: configError } = await supabaseClient
    .from("email_configs")
    .select("*, webinars!inner(*)")
    .in("type", ["reminder", "replay"])
    .eq("enabled", true)
    .not("send_before_minutes", "is", null)

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

    const anchorMs = webinar?.scheduled_at ? new Date(webinar.scheduled_at).getTime() : NaN
    if (!Number.isFinite(anchorMs)) {
      skipped++
      continue
    }

    // Calculate when to send:
    // - reminder (send_before_minutes > 0): X minutes BEFORE webinar starts
    // - replay  (send_before_minutes < 0): X minutes AFTER webinar starts
    const isReplay = config.send_before_minutes < 0
    const sendAt = new Date(
      anchorMs + (config.send_before_minutes ?? 0) * 60 * 1000,
    )

    // For replay, only send after the webinar has started
    if (isReplay && new Date(webinar.scheduled_at) > new Date()) {
      skipped++
      continue
    }

    // Skip if the send time has already passed
    if (sendAt <= new Date()) {
      skipped++
      continue
    }

    // Fetch registrations for this webinar
    const { data: registrations } = await supabaseClient
      .from("registrations")
      .select("id, webinar_id, email, name, waitlisted")
      .eq("webinar_id", webinar.id)
      .eq("waitlisted", false)

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

      const { error: insertError } = await insertQueueEntryWithRetry(supabaseClient, {
        email_config_id: config.id,
        registration_id: reg.id,
        scheduled_at: sendAt.toISOString(),
        status: "pending",
      })

      if (insertError) {
        console.error(`Error inserting queue for ${reg.email} after ${INSERT_MAX_ATTEMPTS} attempts:`, insertError)
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
