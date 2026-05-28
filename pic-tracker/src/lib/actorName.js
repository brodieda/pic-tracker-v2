// lib/actorName.js — per-device "who am I" identity for writer/viewer roles.
//
// Stamped into activity_log.actor_name for attribution. Free text, persists
// in localStorage so a device doesn't re-prompt every refresh.
//
// Intake-only role does not use this — they enter their name as part of the
// intake form submission itself.

const KEY = 'pic_actor_name'

export function getActorName() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function setActorName(name) {
  const clean = (name || '').trim().slice(0, 60)
  try {
    if (clean) localStorage.setItem(KEY, clean)
    else localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function clearActorName() {
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
}

// Used by activity_log writes. Returns "Anonymous" if nothing set so
// the database column always has a value.
export function getActorNameForLog() {
  return getActorName() || 'Anonymous'
}
