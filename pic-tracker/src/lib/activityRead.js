// lib/activityRead.js — per-device "last opened the activity bell" timestamp.
// Used only to clear the "unseen feed" portion of the bell's badge count.
// Overdue welfare checks are NOT gated by this — they stay counted until
// actually marked checked, regardless of whether the panel's been opened.

const KEY = 'pic_activity_last_seen'

export function getActivityLastSeen() {
  try {
    return Number(localStorage.getItem(KEY) || 0)
  } catch {
    return 0
  }
}

export function setActivityLastSeenNow() {
  try {
    localStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* noop */
  }
}
