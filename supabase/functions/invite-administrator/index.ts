import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, role, orgId } = await req.json()

    if (!email || !role || !orgId) {
      return new Response(
        JSON.stringify({ error: "email, role, and orgId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!["admin", "presenter", "attendee"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be admin, presenter, or attendee" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create Supabase admin client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get the authenticated user who is making the invite
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify the caller is an admin of the org
    const token = authHeader.replace("Bearer ", "")
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check that caller belongs to the org and is admin
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, org_id")
      .eq("user_id", caller.id)
      .eq("org_id", orgId)
      .single()

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only org admins can invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check if user already exists in this org
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .eq("org_id", orgId)
      .filter("user_id", "in", `(select id from auth.users where email = '${email}')`)
      .maybeSingle()

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "User is already a member of this organization" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Send invite via Supabase Auth admin (magic link)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${req.headers.get("origin") ?? "http://localhost:3000"}/dashboard`,
      data: {
        invited_by: caller.id,
        org_id: orgId,
        role: role,
      },
    })

    if (inviteError) {
      console.error("Invite error:", inviteError)
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create a pending profile entry
    if (inviteData.user) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: inviteData.user.id,
          org_id: orgId,
          role: role,
          invited_by: caller.id,
          invite_status: "pending",
          invited_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error("Profile creation error:", profileError)
        // Don't fail — the auth handle_new_user trigger will also create a profile
        // But it creates with the default org. We need to update it.
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            org_id: orgId,
            role: role,
            invited_by: caller.id,
            invite_status: "pending",
            invited_at: new Date().toISOString(),
          })
          .eq("user_id", inviteData.user.id)

        if (updateError) {
          console.error("Profile update error:", updateError)
        }
      }
    }

    // Audit log: user invited
    await supabaseAdmin.from("audit_logs").insert({
      org_id: orgId,
      user_id: caller.id,
      action: "invite",
      entity_type: "user",
      entity_id: inviteData.user?.id ?? null,
      description: `Usuário ${email} convidado como ${role}`,
    })

    return new Response(
      JSON.stringify({ success: true, message: `Convite enviado para ${email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    console.error("Unexpected error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
