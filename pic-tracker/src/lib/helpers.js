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
