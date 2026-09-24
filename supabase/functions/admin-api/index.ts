import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

function error(message: string, status = 400) {
  return json({ success: false, error: message }, status)
}

function paginated(data: unknown[], total: number, page: number, perPage: number) {
  return json({
    success: true,
    data,
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  })
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Escapes LIKE wildcards so `ilike` behaves as a case-insensitive equality. */
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (c) => "\\" + c)
}

async function getAdminUser(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.slice(7)

  // Verify JWT and get user
  const svcClient = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error: authError } = await svcClient.auth.getUser(token)

  if (authError || !user) {
    return null
  }

  // Check if user is a platform admin. The real platform_admins schema identifies admins
  // by e-mail (columns: id, email, name, is_active, ...; there is no user_id column).
  if (!user.email || !user.email_confirmed_at) return null

  const { data: admin } = await svcClient
    .from("platform_admins")
    .select("id, name, email, is_active")
    .ilike("email", escapeLikePattern(user.email)) // exact, case-insensitive
    .maybeSingle()

  if (!admin || admin.is_active === false) return null

  // `id` is the auth user id: audit_logs.user_id references auth.users.
  return { id: user.id, platformAdminId: admin.id, name: admin.name, email: admin.email }
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────

async function logAudit(
  svcClient: ReturnType<typeof createClient>,
  params: {
    orgId?: string
    userId: string
    action: string
    entityType: string
    entityId?: string
    description?: string
    metadata?: Record<string, unknown>
    isPlatform?: boolean
  }
) {
  const { error: auditError } = await svcClient.from("audit_logs").insert({
    org_id: params.orgId ?? "00000000-0000-0000-0000-000000000000",
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    description: params.description,
    metadata: params.metadata ?? {},
    is_platform_action: params.isPlatform ?? false,
  })

  if (auditError) {
    console.error("audit_logs insert failed:", auditError, params.action)
  }
}

// ─── Subscriptions (plans) ────────────────────────────────────────────────────

const SUBSCRIPTION_STATUSES = ["trial", "active", "past_due", "canceled"]

// GET /subscriptions/plans            -> catálogo de planos
// PATCH /subscriptions/:orgId         -> { plan_id?, status?, trial_ends_at?, internal_notes? }
async function handleSubscriptions(
  svcClient: ReturnType<typeof createClient>,
  method: string,
  pathParts: string[],
  body: Record<string, unknown> | null,
  adminUser: { id: string; email: string }
) {
  if (method === "GET" && pathParts[1] === "plans") {
    const { data, error: err } = await svcClient
      .from("plans")
      .select("id, code, name, seat_limit, reference_price_monthly, is_active")
      .order("seat_limit", { ascending: true, nullsFirst: false })
    if (err) return error(err.message, 400)
    return json({ success: true, data })
  }

  if (method === "PATCH" && pathParts.length === 2) {
    const orgId = pathParts[1]
    const updates: Record<string, unknown> = {}

    if (body && "plan_id" in body) {
      const { data: plan } = await svcClient.from("plans").select("id").eq("id", body.plan_id).maybeSingle()
      if (!plan) return error("Unknown plan", 400)
      updates.plan_id = body.plan_id
    }
    if (body && "status" in body) {
      if (!SUBSCRIPTION_STATUSES.includes(String(body.status))) return error("Invalid status", 400)
      updates.status = body.status
    }
    if (body && "trial_ends_at" in body) {
      const value = body.trial_ends_at
      if (value !== null && Number.isNaN(new Date(String(value)).getTime())) {
        return error("Invalid trial_ends_at", 400)
      }
      updates.trial_ends_at = value
    }
    if (body && "internal_notes" in body) {
      updates.internal_notes = body.internal_notes === null ? null : String(body.internal_notes).slice(0, 2000)
    }

    if (Object.keys(updates).length === 0) return error("Nothing to update", 400)

    const { data: before } = await svcClient
      .from("org_subscriptions")
      .select("plan_id, status, trial_ends_at, internal_notes")
      .eq("org_id", orgId)
      .maybeSingle()

    if (!before) return error("Subscription not found for organization", 404)

    const { data, error: err } = await svcClient
      .from("org_subscriptions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .select("plan_id, status, trial_ends_at, internal_notes")
      .single()

    if (err) return error(err.message, 400)

    await logAudit(svcClient, {
      orgId,
      userId: adminUser.id,
      action: "UPDATE_SUBSCRIPTION",
      entityType: "subscription",
      entityId: orgId,
      description: "Updated organization plan/subscription",
      metadata: { before, after: data },
      isPlatform: true,
    })

    return json({ success: true, data })
  }

  return error("Method not allowed", 405)
}

// ─── Entity Routes ─────────────────────────────────────────────────────────────

// GET /orgs, GET /orgs/:id, PATCH /orgs/:id, DELETE /orgs/:id
async function handleOrgs(
  svcClient: ReturnType<typeof createClient>,
  method: string,
  pathParts: string[],
  query: URLSearchParams,
  body: Record<string, unknown> | null,
  adminUser: { id: string; email: string }
) {
  const page = Math.max(1, parseInt(query.get("page") ?? "1"))
  const perPage = Math.min(100, Math.max(1, parseInt(query.get("per_page") ?? "20")))
  const offset = (page - 1) * perPage
  const search = query.get("search") ?? ""

  if (method === "GET" && pathParts.length === 1) {
    // List orgs
    let q = svcClient
      .from("organizations")
      .select("id, name, slug, status, created_at, owner_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1)

    if (search) {
      q = q.ilike("name", `%${search}%`)
    }

    const { data, error: err, count } = await q

    if (err) return error(err.message, 500)
    return paginated(data ?? [], count ?? 0, page, perPage)
  }

  if (method === "GET" && pathParts.length === 2) {
    // Get single org with stats
    const orgId = pathParts[1]
    const [{ data: org, error: orgErr }, { data: stats, error: statsErr }] = await Promise.all([
      svcClient.from("organizations").select("*").eq("id", orgId).single(),
      svcClient.rpc("get_org_stats", { p_org_id: orgId }).single(),
    ])

    if (orgErr) return error("Organization not found", 404)
    return json({ success: true, data: { ...org, stats: statsErr ? null : stats } })
  }

  if (method === "PATCH" && pathParts.length === 2) {
    const orgId = pathParts[1]
    const allowed = ["name", "status", "suspended_reason"]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body && key in body) {
        updates[key] = body[key]
      }
    }

    if (body?.status === "suspended" && !updates.suspended_at) {
      updates.suspended_at = new Date().toISOString()
    }

    const { data, error: err } = await svcClient
      .from("organizations")
      .update(updates)
      .eq("id", orgId)
      .select()
      .single()

    if (err) return error(err.message, 400)

    await logAudit(svcClient, {
      orgId,
      userId: adminUser.id,
      action: "UPDATE",
      entityType: "organization",
      entityId: orgId,
      description: `Updated organization: ${data.name}`,
      isPlatform: true,
    })

    return json({ success: true, data })
  }

  if (method === "DELETE" && pathParts.length === 2) {
    const orgId = pathParts[1]
    const { error: err } = await svcClient.from("organizations").delete().eq("id", orgId)
    if (err) return error(err.message, 400)

    await logAudit(svcClient, {
      orgId,
      userId: adminUser.id,
      action: "DELETE",
      entityType: "organization",
      entityId: orgId,
      description: `Deleted organization`,
      isPlatform: true,
    })

    return json({ success: true })
  }

  return error("Method not allowed", 405)
}

// GET /users, GET /users/:id, PATCH /users/:id
async function handleUsers(
  svcClient: ReturnType<typeof createClient>,
  method: string,
  pathParts: string[],
  query: URLSearchParams,
  body: Record<string, unknown> | null,
  adminUser: { id: string; email: string }
) {
  const page = Math.max(1, parseInt(query.get("page") ?? "1"))
  const perPage = Math.min(100, Math.max(1, parseInt(query.get("per_page") ?? "20")))
  const offset = (page - 1) * perPage
  const search = query.get("search") ?? ""
  const orgId = query.get("org_id") ?? ""

  if (method === "GET" && pathParts.length === 1) {
    let q = svcClient
      .from("profiles")
      .select(`
        id, user_id, org_id, role, display_name, avatar_url, locale,
        created_at, updated_at, invite_status, invited_by, invited_at,
        organizations!inner(name, slug)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1)

    if (search) {
      q = q.ilike("display_name", `%${search}%`)
    }
    if (orgId) {
      q = q.eq("org_id", orgId)
    }

    const { data, error: err, count } = await q
    if (err) return error(err.message, 500)
    return paginated(data ?? [], count ?? 0, page, perPage)
  }

  if (method === "GET" && pathParts.length === 2) {
    const profileId = pathParts[1]
    const { data, error: err } = await svcClient
      .from("profiles")
      .select(`
        id, user_id, org_id, role, display_name, avatar_url, locale,
        created_at, updated_at, invite_status, invited_by, invited_at,
        organizations!inner(name, slug)
      `)
      .eq("id", profileId)
      .single()

    if (err) return error("User not found", 404)
    return json({ success: true, data })
  }

  if (method === "PATCH" && pathParts.length === 2) {
    const profileId = pathParts[1]
    const allowed = ["role", "display_name", "invite_status"]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body && key in body) {
        updates[key] = body[key]
      }
    }

    const { data, error: err } = await svcClient
      .from("profiles")
      .update(updates)
      .eq("id", profileId)
      .select()
      .single()

    if (err) return error(err.message, 400)

    await logAudit(svcClient, {
      orgId: data.org_id,
      userId: adminUser.id,
      action: "UPDATE",
      entityType: "profile",
      entityId: profileId,
      description: `Updated profile role to ${data.role}`,
      isPlatform: true,
    })

    return json({ success: true, data })
  }

  return error("Method not allowed", 405)
}

// GET /webinars, GET /webinars/:id, DELETE /webinars/:id
async function handleWebinars(
  svcClient: ReturnType<typeof createClient>,
  method: string,
  pathParts: string[],
  query: URLSearchParams,
  _body: Record<string, unknown> | null,
  adminUser: { id: string; email: string }
) {
  const page = Math.max(1, parseInt(query.get("page") ?? "1"))
  const perPage = Math.min(100, Math.max(1, parseInt(query.get("per_page") ?? "20")))
  const offset = (page - 1) * perPage
  const search = query.get("search") ?? ""
  const status = query.get("status") ?? ""

  if (method === "GET" && pathParts.length === 1) {
    let q = svcClient
      .from("webinars")
      .select(`
        id, title, slug, status, type, scheduled_at, created_at,
        organizations!inner(name, slug)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1)

    if (search) {
      q = q.ilike("title", `%${search}%`)
    }
    if (status) {
      q = q.eq("status", status)
    }

    const { data, error: err, count } = await q
    if (err) return error(err.message, 500)
    return paginated(data ?? [], count ?? 0, page, perPage)
  }

  if (method === "GET" && pathParts.length === 2) {
    const webinarId = pathParts[1]
    const { data, error: err } = await svcClient
      .from("webinars")
      .select(`
        *,
        organizations!inner(name, slug)
      `)
      .eq("id", webinarId)
      .single()

    if (err) return error("Webinar not found", 404)
    return json({ success: true, data })
  }

  if (method === "DELETE" && pathParts.length === 2) {
    const webinarId = pathParts[1]
    const { data: webinar, error: fetchErr } = await svcClient
      .from("webinars")
      .select("org_id, title")
      .eq("id", webinarId)
      .single()

    if (fetchErr) return error("Webinar not found", 404)

    const { error: delErr } = await svcClient.from("webinars").delete().eq("id", webinarId)
    if (delErr) return error(delErr.message, 400)

    await logAudit(svcClient, {
      orgId: webinar.org_id,
      userId: adminUser.id,
      action: "DELETE",
      entityType: "webinar",
      entityId: webinarId,
      description: `Deleted webinar: ${webinar.title}`,
      isPlatform: true,
    })

    return json({ success: true })
  }

  return error("Method not allowed", 405)
}

// GET /audit
async function handleAudit(
  svcClient: ReturnType<typeof createClient>,
  _method: string,
  pathParts: string[],
  query: URLSearchParams,
  _body: Record<string, unknown> | null,
  adminUser: { id: string }
) {
  if (pathParts[1] !== undefined) return error("Not found", 404)

  const page = Math.max(1, parseInt(query.get("page") ?? "1"))
  const perPage = Math.min(100, Math.max(1, parseInt(query.get("per_page") ?? "50")))
  const offset = (page - 1) * perPage
  const entityType = query.get("entity_type") ?? ""
  const orgId = query.get("org_id") ?? ""
  const action = query.get("action") ?? ""

  let q = svcClient
    .from("audit_logs")
    .select(`
      id, action, entity_type, entity_id, description, metadata, created_at,
      org_id, user_id
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1)

  if (entityType) q = q.eq("entity_type", entityType)
  if (orgId) q = q.eq("org_id", orgId)
  if (action) q = q.eq("action", action)

  const { data, error: err, count } = await q
  if (err) return error(err.message, 500)

  // Enrich with user display names
  const userIds = [...new Set((data ?? []).map((l) => l.user_id).filter(Boolean))]
  let userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await svcClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds)
    userMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name]))
  }

  const enriched = (data ?? []).map((l) => ({
    ...l,
    user_name: userMap[l.user_id] ?? "Unknown",
  }))

  return paginated(enriched, count ?? 0, page, perPage)
}

// GET /system/stats
async function handleSystem(
  svcClient: ReturnType<typeof createClient>,
  adminUser: { id: string }
) {
  const [
    { count: orgCount },
    { count: userCount },
    { count: webinarCount },
    { count: registrationCount },
    { data: queueStats },
    { data: emailConfigs },
  ] = await Promise.all([
    svcClient.from("organizations").select("*", { count: "exact", head: true }),
    svcClient.from("profiles").select("*", { count: "exact", head: true }),
    svcClient.from("webinars").select("*", { count: "exact", head: true }),
    svcClient.from("registrations").select("*", { count: "exact", head: true }),
    svcClient.from("email_queue").select("status", { count: "exact" }).in("status", ["pending", "processing"]),
    svcClient.from("email_configs").select("type, active"),
  ])

  // Count by status for key entities
  const [{ data: orgStatusCounts }, { data: webinarStatusCounts }] = await Promise.all([
    svcClient.from("organizations").select("status").then(({ data }) => {
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        counts[row.status ?? "active"] = (counts[row.status ?? "active"] ?? 0) + 1
      }
      return { data: counts }
    }),
    svcClient.from("webinars").select("status").then(({ data }) => {
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        counts[row.status ?? "draft"] = (counts[row.status ?? "draft"] ?? 0) + 1
      }
      return { data: counts }
    }),
  ])

  return json({
    success: true,
    data: {
      counts: {
        organizations: orgCount ?? 0,
        users: userCount ?? 0,
        webinars: webinarCount ?? 0,
        registrations: registrationCount ?? 0,
      },
      queue: {
        pending: queueStats ?? 0,
      },
      email_configs: emailConfigs ?? [],
      status_breakdown: {
        organizations: orgStatusCounts ?? {},
        webinars: webinarStatusCounts ?? {},
      },
    },
  })
}

// GET /admins — list platform admins
async function handleAdmins(
  svcClient: ReturnType<typeof createClient>,
  method: string,
  pathParts: string[],
  query: URLSearchParams,
  body: Record<string, unknown> | null,
  adminUser: { id: string; email: string }
) {
  if (method === "GET" && pathParts.length === 1) {
    const { data, error: err } = await svcClient
      .from("platform_admins")
      .select("*")
      .order("created_at", { ascending: true })
    if (err) return error(err.message, 500)
    return json({ success: true, data })
  }

  if (method === "POST" && pathParts.length === 1) {
    const name = (body?.name ?? body?.display_name) as string | undefined
    const email = (body?.email as string | undefined)?.trim().toLowerCase()

    if (!name || !email) {
      return error("Missing required fields: name, email", 400)
    }

    const { data, error: err } = await svcClient
      .from("platform_admins")
      .insert({ name, email, is_active: true })
      .select()
      .single()

    if (err) return error(err.message, 400)

    await logAudit(svcClient, {
      userId: adminUser.id,
      action: "GRANT_ADMIN",
      entityType: "platform_admin",
      entityId: data.id,
      description: `Granted platform admin to ${email}`,
      isPlatform: true,
    })

    return json({ success: true, data }, 201)
  }

  if (method === "DELETE" && pathParts.length === 2) {
    const adminId = pathParts[1]

    // Prevent removing yourself
    const { data: target } = await svcClient
      .from("platform_admins")
      .select("email")
      .eq("id", adminId)
      .maybeSingle()

    if (target?.email && target.email.toLowerCase() === adminUser.email.toLowerCase()) {
      return error("Cannot remove yourself as platform admin", 400)
    }

    const { error: err } = await svcClient
      .from("platform_admins")
      .delete()
      .eq("id", adminId)

    if (err) return error(err.message, 400)

    await logAudit(svcClient, {
      userId: adminUser.id,
      action: "REVOKE_ADMIN",
      entityType: "platform_admin",
      entityId: adminId,
      description: "Revoked platform admin access",
      isPlatform: true,
    })

    return json({ success: true })
  }

  return error("Method not allowed", 405)
}

// ─── Router ──────────────────────────────────────────────────────────────────

async function handleRequest(req: Request, adminUser: { id: string; email: string }) {
  const url = new URL(req.url)
  const pathParts = url.pathname.replace("/admin-api", "").split("/").filter(Boolean)
  const entity = pathParts[0]
  const query = url.searchParams

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const svcClient = createClient(supabaseUrl, supabaseServiceKey)

  let body: Record<string, unknown> | null = null
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.json()
    } catch {
      return error("Invalid JSON body", 400)
    }
  }

  switch (entity) {
    case "orgs":
      return handleOrgs(svcClient, req.method, pathParts, query, body, adminUser)
    case "users":
      return handleUsers(svcClient, req.method, pathParts, query, body, adminUser)
    case "webinars":
      return handleWebinars(svcClient, req.method, pathParts, query, body, adminUser)
    case "audit":
      return handleAudit(svcClient, req.method, pathParts, query, body, adminUser)
    case "system":
      return handleSystem(svcClient, adminUser)
    case "admins":
      return handleAdmins(svcClient, req.method, pathParts, query, body, adminUser)
    case "subscriptions":
      return handleSubscriptions(svcClient, req.method, pathParts, body, adminUser)
    default:
      return error(`Unknown entity: ${entity}`, 404)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get("Authorization")
  const adminUser = await getAdminUser(authHeader ?? "")

  if (!adminUser) {
    return error("Unauthorized — platform admin access required", 401)
  }

  try {
    return await handleRequest(req, adminUser)
  } catch (err) {
    console.error("admin-api error:", err)
    return error("Internal server error", 500)
  }
})
