// lib/helpers.js — time formatting, derived state computations

// Format an ISO timestamp without timezone (as stored). Returns "now" as ISO local string.
export function nowIso() {
  const d = new Date()
  // Build a local-time ISO string (no Z), seconds precision
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds())
  )
}

export function formatClock(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Elapsed minutes between two ISO strings (b - a). If b is null, uses now.
export function elapsedMinutes(aIso, bIso) {
  if (!aIso) return 0
  const a = new Date(aIso).getTime()
  const b = bIso ? new Date(bIso).getTime() : Date.now()
  return Math.max(0, Math.floor((b - a) / 60000))
}

// Format elapsed minutes as "1h 23m" or "47m"
export function formatElapsed(mins) {
  if (mins == null || isNaN(mins)) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

// Highest code = lowest number among admit/code_change events for this PIC
export function highestCodeFor(picId, events) {
  const relevant = events.filter(
    (e) => e.picId === picId && (e.type === 'admit' || e.type === 'code_change'),
  )
  if (relevant.length === 0) return null
  return Math.min(...relevant.map((e) => e.code))
}

// Current code = code of most recent admit/code_change event
export function currentCodeFor(picId, events) {
  const relevant = events
    .filter((e) => e.picId === picId && (e.type === 'admit' || e.type === 'code_change'))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return relevant[0]?.code ?? null
}

// Which shift is this KPE on? Returns 1, 2, or null. (null if on neither or both — both = treat as shift 1)
export function shiftFor(kpeName, eventCfg) {
  if (!kpeName || !eventCfg) return null
  if (eventCfg.shift1Team?.includes(kpeName)) return 1
  if (eventCfg.shift2Team?.includes(kpeName)) return 2
  return null
}
