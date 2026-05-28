// lib/eventSession.js — wraps Supabase auth + caches role for fast UI checks.

import { supabase } from './supabaseClient'

const KEY = 'pic_session'

const DEFAULT_SESSION = {
  role: 'none', // 'none' | 'writer' | 'viewer' | 'intake_only'
  eventId: null,
  eventName: null,
  writerCode: null,
  viewerCode: null,
  admitCode: null,
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SESSION }
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) }
  } catch (e) {
    console.error('eventSession.read failed', e)
    return { ...DEFAULT_SESSION }
  }
}

function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch (e) {
    console.error('eventSession.write failed', e)
  }
}

export function getSession() { return read() }
export function isWriter() { return read().role === 'writer' }
export function isViewer() { return read().role === 'viewer' }
export function isIntakeOnly() { return read().role === 'intake_only' }
export function hasJoined() { return read().role !== 'none' }

export function setSessionData(s) {
  write({ ...DEFAULT_SESSION, ...s })
}

export function updateCachedEventName(name) {
  const s = read()
  if (s.role === 'none') return
  write({ ...s, eventName: name })
}

export async function clearSession() {
  if (supabase) {
    try { await supabase.auth.signOut() } catch (e) { console.error('signOut failed', e) }
  }
  try { localStorage.removeItem(KEY) } catch (e) { /* noop */ }
}
