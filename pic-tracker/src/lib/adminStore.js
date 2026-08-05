// lib/adminStore.js — admin dashboard data access. Fully separate from the
// event-role session in eventSession.js: an admin session is just an opaque
// token, checked server-side on every call, not a Supabase Auth/JWT claim.

import { supabase } from './supabaseClient'

const TOKEN_KEY = 'pic_admin_token'

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

export function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

export function isAdminLoggedIn() {
  return !!getAdminToken()
}

export async function adminLogin(code) {
  const { data, error } = await supabase.rpc('admin_login', { p_code: code })
  if (error) throw error
  if (!data) return false
  setAdminToken(data)
  return true
}

export function adminLogout() {
  setAdminToken(null)
}

// Wraps every admin RPC call: if the server says the token's invalid/expired,
// clear it locally so the UI can drop back to the login screen instead of
// silently failing.
async function callAdmin(fn, params) {
  const token = getAdminToken()
  if (!token) throw new Error('Not logged in as admin')
  const { data, error } = await supabase.rpc(fn, { p_token: token, ...params })
  if (error) {
    if ((error.message || '').toLowerCase().includes('not authorized')) {
      setAdminToken(null)
    }
    throw error
  }
  return data
}

export async function adminListEvents() {
  const rows = await callAdmin('admin_list_events', {})
  return (rows || []).map(eventRowToAdmin)
}

export async function adminEventRoster(eventId) {
  const rows = await callAdmin('admin_event_roster', { p_event_id: eventId })
  return (rows || []).map((r) => ({
    id: r.id,
    actorName: r.actor_name,
    role: r.role,
    firstJoinedAt: r.first_joined_at,
    lastSeenAt: r.last_seen_at,
  }))
}

export async function adminRotateAllCodes(eventId) {
  const rows = await callAdmin('admin_rotate_all_codes', { p_event_id: eventId })
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) return null
  return { writerCode: row.writer_code, viewerCode: row.viewer_code, admitCode: row.admit_code }
}

export async function adminEndEvent(eventId) {
  return callAdmin('admin_end_event', { p_event_id: eventId })
}

export async function adminDeleteEvent(eventId) {
  return callAdmin('admin_delete_event', { p_event_id: eventId })
}

// Returns { event, pics, activity } shaped for exportXlsx() — see
// components/AdminScreen.jsx for how it's fed in.
export async function adminEventExportData(eventId) {
  const data = await callAdmin('admin_event_export_data', { p_event_id: eventId })
  return data
}

function eventRowToAdmin(row) {
  return {
    id: row.id,
    name: row.name || 'Untitled event',
    createdAt: row.created_at,
    isActive: row.is_active,
    capacity: row.capacity,
    writerCode: row.writer_code,
    viewerCode: row.viewer_code,
    admitCode: row.admit_code,
  }
}

// Called by the app (not admin) right after joining an event, and whenever
// the actor name is set/changed. No-ops harmlessly if not currently joined
// to an event (e.g. called from an admin session — the RPC checks this
// server-side and just returns without writing anything).
export async function syncActorPresence(actorName) {
  try {
    await supabase.rpc('sync_actor_presence', { p_actor_name: actorName || 'Anonymous' })
  } catch (e) {
    // Non-fatal — presence tracking should never block the actual join/rename.
    console.error('sync_actor_presence failed', e)
  }
}
