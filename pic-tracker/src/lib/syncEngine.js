// lib/syncEngine.js — pulls Supabase state into localStorage so reads stay local.
//
// Two sync types:
//   - initialSync()   — runs once after a device joins. Wipes local PICs/events
//                       and replaces them with everything from Supabase for the
//                       current event. Also writes the event config.
//   - backgroundSync()— periodic pull (every N seconds). Idempotent. Used to
//                       keep secondary devices in sync with the writer's changes.
//
// Reads on the writer device come from localStorage which is the source of
// truth (writer mirrors writes both ways). Secondary devices are read-mostly
// and pull from Supabase periodically.

import { supabase, SUPABASE_CONFIGURED } from './supabaseClient'
import { getSession } from './eventSession'
import {
  getCurrentEvent,
  getPicsForCurrentEvent,
  getActivityForCurrentEvent,
} from './supabaseStore'
import { saveEvent, savePics, saveEvents, KEYS } from './store'

// Build a stable local id from a PIC number.
function localIdFor(number) {
  return `pic_${String(number).padStart(3, '0')}`
}

// Translate Supabase PIC -> localStorage PIC shape (matches the existing schema
// the rest of the app expects).
function picToLocal(p) {
  return {
    id: localIdFor(p.number),
    number: p.number,
    name: p.name,
    gender: p.gender,
    ageRange: p.ageRange,
    description: p.description,
    enteredCare: p.enteredCare,
    leftCare: p.leftCare,
    referredBy: p.referredBy || [],
    referredByOther: p.referredByOther,
    substances: p.substances || [],
    substanceOther: p.substanceOther,
    presentations: p.presentations || [],
    presentationOther: p.presentationOther,
    intakeKpe: p.intakeKpe,
    assignedKpe: p.assignedKpe,
    outcome: p.outcome,
    outcomeOther: p.outcomeOther,
    referredTo: p.referredTo || [],
    referredToOther: p.referredToOther,
    medicalInvolved: p.medicalInvolved,
    lastKpe: p.lastKpe,
    tlSignoff: p.tlSignoff,
    ejectionFlag: !!p.ejectionFlag,
    securityNotified: p.securityNotified,
    source: p.source || 'writer',
    status: p.status,
  }
}

// Translate Supabase activity_log row -> local event shape.
// Note: the `picId` in local events refers to the local pic id (pic_001 style)
// because the rest of the app uses that as the join key. Build a UUID->number
// map from the PICs list to translate.
function activityToLocal(a, picUuidToNumber) {
  const number = picUuidToNumber.get(a.picId)
  return {
    id: a.id, // keep the Supabase UUID — unique, monotonic by timestamp anyway
    picId: number != null ? localIdFor(number) : a.picId,
    timestamp: a.timestamp,
    type: a.type,
    code: a.code,
    kpe: a.kpe,
    note: a.note,
    meta: a.meta || {},
  }
}

// Translate Supabase event row -> localStorage event shape.
function eventToLocal(e) {
  return {
    name: e.name || '',
    shift1Team: e.shift1Team || [],
    shift2Team: e.shift2Team || [],
    code3CheckIntervalMinutes: e.code3CheckIntervalMinutes || 15,
    capacity: e.capacity,
  }
}

// Bump the local sequence counter so any subsequent writer admissions don't
// collide with existing PIC numbers.
function bumpSeqTo(maxNumber) {
  const current = Number(localStorage.getItem(KEYS.seq)) || 0
  if (maxNumber > current) {
    localStorage.setItem(KEYS.seq, String(maxNumber))
  }
}

// --- Public API ---

// Pull everything from Supabase and overwrite local state. Run after joining.
export async function initialSync() {
  if (!SUPABASE_CONFIGURED) return { ok: false, reason: 'not_configured' }
  const s = getSession()
  if (s.role === 'none' || !s.eventId) return { ok: false, reason: 'no_session' }

  try {
    const [event, pics, activity] = await Promise.all([
      getCurrentEvent(),
      getPicsForCurrentEvent(),
      getActivityForCurrentEvent(),
    ])

    if (event) saveEvent(eventToLocal(event))

    const picUuidToNumber = new Map()
    for (const p of pics) picUuidToNumber.set(p.id, p.number)

    const localPics = pics.map(picToLocal)
    savePics(localPics)

    const localActivity = activity.map((a) => activityToLocal(a, picUuidToNumber))
    saveEvents(localActivity)

    const maxNumber = pics.reduce((m, p) => Math.max(m, p.number || 0), 0)
    bumpSeqTo(maxNumber)

    return { ok: true, picCount: pics.length, activityCount: activity.length }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[syncEngine] initialSync failed:', e)
    return { ok: false, reason: 'error', error: e }
  }
}

// Same as initialSync but signals it's not first-time. Functionally identical
// for now — both wipe and reload. The split exists so we can make background
// sync smarter (delta pulls, conflict awareness) later without changing callers.
export async function backgroundSync() {
  return initialSync()
}

let _intervalId = null

// Start a background polling loop. Calls backgroundSync every `intervalMs`.
// Safe to call multiple times — it'll replace the existing interval.
export function startBackgroundSync({ intervalMs = 15000, onSync } = {}) {
  stopBackgroundSync()
  _intervalId = setInterval(async () => {
    const result = await backgroundSync()
    if (result.ok && onSync) onSync(result)
  }, intervalMs)
}

export function stopBackgroundSync() {
  if (_intervalId) {
    clearInterval(_intervalId)
    _intervalId = null
  }
}
