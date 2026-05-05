// lib/helpers.js — time formatting, derived state, PIC mutations

import { getPics, savePics, getEvents, addEvent, nextEventId } from './store'

// ---------- Time ----------

export function nowIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) +
    ':' + pad(d.getMinutes()) +
    ':' + pad(d.getSeconds())
  )
}

export function formatClock(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert an ISO datetime to value for <input type="datetime-local">
export function isoToDatetimeLocal(iso) {
  if (!iso) return ''
  // Strip seconds and any timezone marker
  return iso.slice(0, 16)
}

// And back — append :00 seconds for our schema
export function datetimeLocalToIso(local) {
  if (!local) return null
  return local.length === 16 ? `${local}:00` : local
}

export function elapsedMinutes(aIso, bIso) {
  if (!aIso) return 0
  const a = new Date(aIso).getTime()
  const b = bIso ? new Date(bIso).getTime() : Date.now()
  return Math.max(0, Math.floor((b - a) / 60000))
}

export function formatElapsed(mins) {
  if (mins == null || isNaN(mins)) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

// ---------- Derived state from event log ----------

export function highestCodeFor(picId, events) {
  const relevant = events.filter(
    (e) => e.picId === picId && (e.type === 'admit' || e.type === 'code_change'),
  )
  if (relevant.length === 0) return null
  return Math.min(...relevant.map((e) => e.code))
}

export function currentCodeFor(picId, events) {
  const relevant = events
    .filter((e) => e.picId === picId && (e.type === 'admit' || e.type === 'code_change'))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return relevant[0]?.code ?? null
}

// History of KPE assignments — chronological, oldest first.
// Each entry: { kpe, timestamp, type } where type is 'assigned' (initial) or 'changed'
export function kpeHistoryFor(picId, events) {
  return events
    .filter((e) => e.picId === picId && (e.type === 'admit' || e.type === 'kpe_change'))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((e) => ({
      kpe: e.kpe,
      timestamp: e.timestamp,
      type: e.type === 'admit' ? 'assigned' : 'changed',
    }))
    .filter((entry) => entry.kpe) // drop entries where no kpe was assigned at the time
}

export function shiftFor(kpeName, eventCfg) {
  if (!kpeName || !eventCfg) return null
  if (eventCfg.shift1Team?.includes(kpeName)) return 1
  if (eventCfg.shift2Team?.includes(kpeName)) return 2
  return null
}

// ---------- PIC mutations ----------
// Each writes to localStorage and emits the appropriate event log entry.

function findPicIndex(picId) {
  const pics = getPics()
  const idx = pics.findIndex((p) => p.id === picId)
  return { pics, idx }
}

// Update arbitrary PIC fields. Use for non-tracked changes (description, gender, age etc).
// Tracked changes (code, KPE, time-in) have dedicated functions below that emit events.
export function updatePicFields(picId, patch) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  pics[idx] = { ...pics[idx], ...patch }
  savePics(pics)
  return pics[idx]
}

export function changePicCode(picId, newCode, byKpe, note) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  const ts = nowIso()
  addEvent({
    id: nextEventId(),
    picId,
    timestamp: ts,
    type: 'code_change',
    code: newCode,
    kpe: byKpe || pics[idx].assignedKpe || null,
    note: note || null,
    meta: {},
  })
  // No PIC field for "current code" — derived from log
  return pics[idx]
}

export function changePicKpe(picId, newKpe, byKpe, note) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  const ts = nowIso()
  pics[idx] = { ...pics[idx], assignedKpe: newKpe || null }
  savePics(pics)
  addEvent({
    id: nextEventId(),
    picId,
    timestamp: ts,
    type: 'kpe_change',
    code: null,
    kpe: newKpe || null,
    note: note || null,
    meta: { changedBy: byKpe || null },
  })
  return pics[idx]
}

export function addPicNote(picId, note, byKpe) {
  if (!note || !note.trim()) return
  addEvent({
    id: nextEventId(),
    picId,
    timestamp: nowIso(),
    type: 'note',
    code: null,
    kpe: byKpe || null,
    note: note.trim(),
    meta: {},
  })
}

// Edit time-in. Updates pic.enteredCare AND retroactively updates the admit event's timestamp,
// so the audit log stays internally consistent.
export function updatePicEnteredCare(picId, newIso) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  pics[idx] = { ...pics[idx], enteredCare: newIso }
  savePics(pics)
  // Retro-update the admit event so derived timing is consistent
  const events = getEvents()
  const admitIdx = events.findIndex((e) => e.picId === picId && e.type === 'admit')
  if (admitIdx >= 0) {
    events[admitIdx] = { ...events[admitIdx], timestamp: newIso }
    // saveEvents not exported via helpers; do it inline
    try {
      localStorage.setItem('pic_events', JSON.stringify(events))
    } catch (e) {
      console.error('Failed to update admit event timestamp', e)
    }
  }
  return pics[idx]
}

// Backwards-compat: read assignedKpe from older PICs that have intakeKpe/currentKpe instead.
// Migrates on first read.
export function getAssignedKpe(pic) {
  if (!pic) return null
  if ('assignedKpe' in pic) return pic.assignedKpe
  // Older record — fallback to currentKpe then intakeKpe
  return pic.currentKpe || pic.intakeKpe || null
}

// Normalise referredBy to an array. Older records used a single string.
export function normalizeReferredBy(pic) {
  if (!pic) return []
  const v = pic.referredBy
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v) return [v]
  return []
}

// Same for referredTo.
export function normalizeReferredTo(pic) {
  if (!pic) return []
  const v = pic.referredTo
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v) return [v]
  return []
}

// Discharge a PIC. Sets status, leftCare, outcome, referredTo, medical, lastKpe, tlSignoff.
// Emits a 'discharge' event with all the relevant context.
export function dischargePic(picId, dischargeData) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  const ts = dischargeData.leftCare || nowIso()
  pics[idx] = {
    ...pics[idx],
    status: 'discharged',
    leftCare: ts,
    outcome: dischargeData.outcome || null,
    outcomeOther: dischargeData.outcomeOther || null,
    referredTo: dischargeData.referredTo || [],
    referredToOther: dischargeData.referredToOther || null,
    medicalInvolved: dischargeData.medicalInvolved ?? null,
    lastKpe: dischargeData.lastKpe || pics[idx].assignedKpe || null,
    tlSignoff: dischargeData.tlSignoff || null,
  }
  savePics(pics)
  addEvent({
    id: nextEventId(),
    picId,
    timestamp: ts,
    type: 'discharge',
    code: null,
    kpe: dischargeData.lastKpe || pics[idx].assignedKpe || null,
    note: dischargeData.note || null,
    meta: {
      outcome: dischargeData.outcome,
      outcomeOther: dischargeData.outcomeOther,
      referredTo: dischargeData.referredTo,
      referredToOther: dischargeData.referredToOther,
      medicalInvolved: dischargeData.medicalInvolved,
      tlSignoff: dischargeData.tlSignoff,
    },
  })
  return pics[idx]
}

// Reverse discharge — moves PIC back to in_care. Logs a note event for audit trail.
export function reopenPic(picId, byKpe, reason) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  pics[idx] = { ...pics[idx], status: 'in_care', leftCare: null }
  savePics(pics)
  addEvent({
    id: nextEventId(),
    picId,
    timestamp: nowIso(),
    type: 'note',
    code: null,
    kpe: byKpe || null,
    note: `Discharge reversed${reason ? `: ${reason}` : ''}`,
    meta: { reopen: true },
  })
  return pics[idx]
}

// Mark a Code 3 (or any) PIC as checked. Resets the welfare-check timer.
export function addCheckEvent(picId, byKpe, note) {
  addEvent({
    id: nextEventId(),
    picId,
    timestamp: nowIso(),
    type: 'check',
    code: null,
    kpe: byKpe || null,
    note: note || null,
    meta: {},
  })
}

// Was this PIC ever Code 2 during this episode? Persistent MH flag.
// Returns true if any admit or code_change event for this PIC had code === 2.
export function wasEverCode2(picId, events) {
  return (events || []).some(
    (e) => e.picId === picId && (e.type === 'admit' || e.type === 'code_change') && e.code === 2,
  )
}

// Count of currently in-care PICs assigned to this KPE.
// Used for workload dots on the KPE tag.
export function workloadFor(kpeName, allPics) {
  if (!kpeName) return 0
  return (allPics || []).filter(
    (p) => p.status === 'in_care' && getAssignedKpe(p) === kpeName,
  ).length
}

// Most recent timestamp of any event for a PIC. Used for "time since last activity".
// For check-due computation, we use admit, code_change, check, kpe_change, note as
// "activity" — anything that signals attention has been paid to this PIC.
export function lastActivityFor(picId, events) {
  const relevant = events
    .filter((e) => e.picId === picId && ['admit', 'code_change', 'check', 'kpe_change', 'note'].includes(e.type))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return relevant[0]?.timestamp || null
}

// Most recent event of any kind for a PIC.
export function latestEventFor(picId, events) {
  const relevant = events
    .filter((e) => e.picId === picId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return relevant[0] || null
}

// Compute Code 3 monitoring state for a PIC.
// Returns one of: null (not applicable), 'ok', 'due_soon', 'overdue'
// Triggers only when current code is 3 and PIC is in care.
// 'due_soon' = within last 25% of interval; 'overdue' = past interval.
export function code3MonitorStateFor(picId, events, eventCfg, now = Date.now()) {
  const code = currentCodeFor(picId, events)
  if (code !== 3) return null
  const interval = (eventCfg?.code3CheckIntervalMinutes || 15) * 60_000
  const last = lastActivityFor(picId, events)
  if (!last) return 'ok'
  const elapsed = now - new Date(last).getTime()
  if (elapsed >= interval) return 'overdue'
  if (elapsed >= interval * 0.75) return 'due_soon'
  return 'ok'
}

// Minutes since last activity for a PIC.
export function minutesSinceLastActivity(picId, events, now = Date.now()) {
  const last = lastActivityFor(picId, events)
  if (!last) return null
  return Math.floor((now - new Date(last).getTime()) / 60_000)
}
