/**
 * Admin API client — wraps the /admin-api Edge Function.
 * All calls include the current user's auth token.
 */
import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`

async function adminFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const res = await fetch(`${EDGE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const json = await res.json()

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request failed: ${res.status}`)
  }

  return json
}

// ─── Orgs ────────────────────────────────────────────────────────────────────

export const adminApi = {
  // Orgs
  listOrgs(params = {}) {
    const qs = new URLSearchParams(params).toString()
    return adminFetch(`/orgs${qs ? `?${qs}` : ''}`)
  },
  getOrg(id) {
    return adminFetch(`/orgs/${id}`)
  },
  updateOrg(id, body) {
    return adminFetch(`/orgs/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  },
  deleteOrg(id) {
    return adminFetch(`/orgs/${id}`, { method: 'DELETE' })
  },

  // Users
  listUsers(params = {}) {
    const qs = new URLSearchParams(params).toString()
    return adminFetch(`/users${qs ? `?${qs}` : ''}`)
  },
  getUser(id) {
    return adminFetch(`/users/${id}`)
  },
  updateUser(id, body) {
    return adminFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  },

  // Webinars
  listWebinars(params = {}) {
    const qs = new URLSearchParams(params).toString()
    return adminFetch(`/webinars${qs ? `?${qs}` : ''}`)
  },
  getWebinar(id) {
    return adminFetch(`/webinars/${id}`)
  },
  deleteWebinar(id) {
    return adminFetch(`/webinars/${id}`, { method: 'DELETE' })
  },

  // System
  getSystemStats() {
    return adminFetch('/system/stats')
  },

  // Audit
  listAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString()
    return adminFetch(`/audit${qs ? `?${qs}` : ''}`)
  },

  // Admins
  listAdmins() {
    return adminFetch('/admins')
  },
  addAdmin(body) {
    return adminFetch('/admins', { method: 'POST', body: JSON.stringify(body) })
  },
  removeAdmin(id) {
    return adminFetch(`/admins/${id}`, { method: 'DELETE' })
  },
}
