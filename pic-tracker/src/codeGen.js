// lib/eventSession.js — tracks the device's current event join state.
//
// Stored in localStorage so refreshes don't kick the device out of the event.
// One of three states:
//   - 'none'        — device hasn't joined anything yet (show landing screen)
//   - 'writer'      — device joined with the writer code (full access)
//   - 'viewer'      — device joined with the viewer code (read-only)
//
// When a writer creates a new event, that device automatically becomes the writer
// for it (it's the only device that has the writer code at that moment).

const KEY = 'pic_session'

const DEFAULT_SESSION = {
  role: 'none', // 'none' | 'writer' | 'viewer'
  eventId: null, // Supabase event UUID
  eventName: null, // for display
  writerCode: null, // only set when role === 'writer'
  viewerCode: null, // set for both writer and viewer roles
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

export function getSession() {
  return read()
}

export function isWriter() {
  return read().role === 'writer'
}

export function isViewer() {
  return read().role === 'viewer'
}

export function hasJoined() {
  return read().role !== 'none'
}

// Called when this device successfully creates a new event (and is therefore the writer).
export function setWriterSession({ eventId, eventName, writerCode, viewerCode }) {
  write({ role: 'writer', eventId, eventName, writerCode, viewerCode })
}

// Called when this device joins an existing event with the writer code.
export function setWriterSessionFromJoin({ eventId, eventName, writerCode, viewerCode }) {
  write({ role: 'writer', eventId, eventName, writerCode, viewerCode })
}

// Called when this device joins with the viewer code.
export function setViewerSession({ eventId, eventName, viewerCode }) {
  write({ role: 'viewer', eventId, eventName, writerCode: null, viewerCode })
}

// Leave the current event — back to landing screen on next load.
export function clearSession() {
  write({ ...DEFAULT_SESSION })
}

// Update cached event name without changing role/codes (e.g. after rename in settings).
export function updateCachedEventName(name) {
  const s = read()
  if (s.role === 'none') return
  write({ ...s, eventName: name })
}
