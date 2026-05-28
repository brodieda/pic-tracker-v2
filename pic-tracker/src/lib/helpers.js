// lib/helpers.js — time formatting, derived state, PIC mutations

import { getPics, savePics, getEvents, addEvent, nextEventId } from './store'
import {
  mirrorPicUpdate,
  mirrorActivity,
  mirrorPicUpdateWithActivity,
} from './dualWrite'

// ---------- Time ----------

// ---------- Time ----------
//
// All stored timestamps are UTC ISO strings with the `Z` suffix
// (e.g. "2026-05-27T08:54:00.000Z"). Display code converts to local
// time via JavaScript's Date object on render.

export function nowIso() {
  return new Date().toISOString()
}

// True iff `iso` is a real UTC ISO string (has Z or +/- offset).
function hasTimezone(iso) {
  if (typeof iso !== 'string') return false
  return iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)
}

// Older localStorage data may contain naive local-time strings (no Z).
// Convert any such value to a real UTC ISO string before parsing.
// This is the central compatibility shim — any function that parses a
// timestamp should run it through here first.
export function normalizeIso(iso) {
  if (!iso) return iso
  if (typeof iso !== 'string') return iso
  if (hasTimezone(iso)) return iso
  // Treat the naive string as local time (the old convention).
  // Parse the components manually so we don't depend on environment locale.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return iso
  const [, Y, Mo, D, H, Mi, S] = m
  const d = new Date(Number(Y), Number(Mo) - 1, Number(D), Number(H), Number(Mi), Number(S || '0'))
  return d.toISOString()
}

export function formatClock(iso) {
  const norm = normalizeIso(iso)
  if (!norm) return '—'
  const d = new Date(norm)
  if (isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateTime(iso) {
  const norm = normalizeIso(iso)
  if (!norm) return '—'
  const d = new Date(norm)
  if (isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert a UTC ISO datetime to the value for <input type="datetime-local">.
// The input expects local-time naive YYYY-MM-DDTHH:MM with no zone.
export function isoToDatetimeLocal(iso) {
  const norm = normalizeIso(iso)
  if (!norm) return ''
  const d = new Date(norm)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) +
    ':' + pad(d.getMinutes())
  )
}

// And back — convert local-time naive YYYY-MM-DDTHH:MM to UTC ISO.
export function datetimeLocalToIso(local) {
  if (!local) return null
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) return local // unknown shape; let caller handle
  const [, Y, Mo, D, H, Mi, S] = m
  const d = new Date(Number(Y), Number(Mo) - 1, Number(D), Number(H), Number(Mi), Number(S || '0'))
  return d.toISOString()
}

export function elapsedMinutes(aIso, bIso) {
  if (!aIso) return 0
  const a = new Date(normalizeIso(aIso)).getTime()
  const b = bIso ? new Date(normalizeIso(bIso)).getTime() : Date.now()
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
  mirrorPicUpdate(pics[idx].number, patch)
  return pics[idx]
}

export function changePicCode(picId, newCode, byKpe, note) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  const ts = nowIso()
  const evt = {
    id: nextEventId(),
    picId,
    timestamp: ts,
    type: 'code_change',
    code: newCode,
    kpe: byKpe || pics[idx].assignedKpe || null,
    note: note || null,
    meta: {},
  }
  addEvent(evt)
  mirrorActivity(pics[idx].number, evt)
  // No PIC field for "current code" — derived from log
  return pics[idx]
}

export function changePicKpe(picId, newKpe, byKpe, note) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  const ts = nowIso()
  pics[idx] = { ...pics[idx], assignedKpe: newKpe || null }
  savePics(pics)
  const evt = {
    id: nextEventId(),
    picId,
    timestamp: ts,
    type: 'kpe_change',
    code: null,
    kpe: newKpe || null,
    note: note || null,
    meta: { changedBy: byKpe || null },
  }
  addEvent(evt)
  mirrorPicUpdateWithActivity(pics[idx].number, { assignedKpe: newKpe || null }, evt)
  return pics[idx]
}

export function addPicNote(picId, note, byKpe) {
  if (!note || !note.trim()) return
  const { pics, idx } = findPicIndex(picId)
  const evt = {
    id: nextEventId(),
    picId,
    timestamp: nowIso(),
    type: 'note',
    code: null,
    kpe: byKpe || null,
    note: note.trim(),
    meta: {},
  }
  addEvent(evt)
  if (idx >= 0) mirrorActivity(pics[idx].number, evt)
}

// Edit time-in. Updates pic.enteredCare AND retroactively updates the admit event's timestamp,
// so the audit log stays internally consistent.
// Note: the retroactive admit-event update is NOT mirrored to Supabase — the activity_log
// is append-only by RLS. The PIC's enteredCare field IS mirrored, which is what reports use.
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
  mirrorPicUpdate(pics[idx].number, { enteredCare: newIso })
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
// For ejection-flagged PICs also records securityNotified (null otherwise — N/A).
// Emits a 'discharge' event with all the relevant context.
export function dischargePic(picId, dischargeData) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  const ts = dischargeData.leftCare || nowIso()
  const wasFlagged = !!pics[idx].ejectionFlag
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
    // Only record securityNotified when the PIC was flagged; otherwise N/A
    securityNotified: wasFlagged ? (dischargeData.securityNotified ?? null) : null,
  }
  savePics(pics)
  const evt = {
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
      // Persist the audit on the event too — null when not applicable
      securityNotified: wasFlagged ? (dischargeData.securityNotified ?? null) : null,
    },
  }
  addEvent(evt)
  mirrorPicUpdateWithActivity(
    pics[idx].number,
    {
      status: 'discharged',
      leftCare: ts,
      outcome: pics[idx].outcome,
      outcomeOther: pics[idx].outcomeOther,
      referredTo: pics[idx].referredTo,
      referredToOther: pics[idx].referredToOther,
      medicalInvolved: pics[idx].medicalInvolved,
      lastKpe: pics[idx].lastKpe,
      tlSignoff: pics[idx].tlSignoff,
      securityNotified: pics[idx].securityNotified,
    },
    evt,
  )
  return pics[idx]
}

// Toggle the ejection flag on a PIC. Emits a 'flag_change' event for the audit trail.
export function setEjectionFlag(picId, value, byKpe) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  const newValue = !!value
  if (pics[idx].ejectionFlag === newValue) return pics[idx]
  pics[idx] = { ...pics[idx], ejectionFlag: newValue }
  savePics(pics)
  const evt = {
    id: nextEventId(),
    picId,
    timestamp: nowIso(),
    type: 'flag_change',
    code: null,
    kpe: byKpe || pics[idx].assignedKpe || null,
    note: null,
    meta: { flag: 'ejection', value: newValue },
  }
  addEvent(evt)
  mirrorPicUpdateWithActivity(pics[idx].number, { ejectionFlag: newValue }, evt)
  return pics[idx]
}

// Reverse discharge — moves PIC back to in_care. Logs a note event for audit trail.
export function reopenPic(picId, byKpe, reason) {
  const { pics, idx } = findPicIndex(picId)
  if (idx < 0) return null
  pics[idx] = { ...pics[idx], status: 'in_care', leftCare: null }
  savePics(pics)
  const evt = {
    id: nextEventId(),
    picId,
    timestamp: nowIso(),
    type: 'note',
    code: null,
    kpe: byKpe || null,
    note: `Discharge reversed${reason ? `: ${reason}` : ''}`,
    meta: { reopen: true },
  }
  addEvent(evt)
  mirrorPicUpdateWithActivity(pics[idx].number, { status: 'in_care', leftCare: null }, evt)
  return pics[idx]
}

// Mark a Code 3 (or any) PIC as checked. Resets the welfare-check timer.
export function addCheckEvent(picId, byKpe, note) {
  const { pics, idx } = findPicIndex(picId)
  const evt = {
    id: nextEventId(),
    picId,
    timestamp: nowIso(),
    type: 'check',
    code: null,
    kpe: byKpe || null,
    note: note || null,
    meta: {},
  }
  addEvent(evt)
  if (idx >= 0) mirrorActivity(pics[idx].number, evt)
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
  const elapsed = now - new Date(normalizeIso(last)).getTime()
  if (elapsed >= interval) return 'overdue'
  if (elapsed >= interval * 0.75) return 'due_soon'
  return 'ok'
}

// Minutes since last activity for a PIC.
export function minutesSinceLastActivity(picId, events, now = Date.now()) {
  const last = lastActivityFor(picId, events)
  if (!last) return null
  return Math.floor((now - new Date(normalizeIso(last)).getTime()) / 60_000)
}
