// store.js — localStorage wrapper for PIC Tracker
// Top-level keys: pic_event, pic_pics, pic_events, pic_seq

const KEYS = {
  event: 'pic_event',
  pics: 'pic_pics',
  events: 'pic_events',
  seq: 'pic_seq', // monotonic counter — never decreases, ensures stable PIC #s
}

const DEFAULT_EVENT = {
  name: '',
  shift1Team: [],
  shift2Team: [],
  code3CheckIntervalMinutes: 15,
  capacity: null, // null = unlimited
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch (e) {
    console.error('store.read failed for', key, e)
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('store.write failed for', key, e)
    alert('Could not save to local storage. Storage may be full — export a JSON backup now.')
  }
}

// --- Event settings ---
export function getEvent() {
  return read(KEYS.event, DEFAULT_EVENT)
}

export function saveEvent(eventData) {
  write(KEYS.event, { ...DEFAULT_EVENT, ...eventData })
}

// --- PICs ---
export function getPics() {
  return read(KEYS.pics, [])
}

export function savePics(pics) {
  write(KEYS.pics, pics)
}

export function addPic(pic) {
  const pics = getPics()
  pics.push(pic)
  savePics(pics)
}

// --- Events log ---
export function getEvents() {
  return read(KEYS.events, [])
}

export function saveEvents(events) {
  write(KEYS.events, events)
}

export function addEvent(evt) {
  const events = getEvents()
  events.push(evt)
  saveEvents(events)
}

// --- PIC numbering: monotonic, stable, never reused ---
// Uses a separate counter so numbers are stable identifiers
// even if records are modified. Survives across sessions.
function getSeq() {
  return read(KEYS.seq, 0)
}

function bumpSeq() {
  const next = getSeq() + 1
  write(KEYS.seq, next)
  return next
}

// Peek the next PIC number without incrementing. Used to display
// "Admitting PIC #X" in the modal before commit.
export function peekNextPicNumber() {
  return getSeq() + 1
}

// Commit & return the next PIC number. Call exactly once per admit.
export function claimNextPicNumber() {
  return bumpSeq()
}

// --- ID helpers ---
export function picIdFromNumber(n) {
  return `pic_${String(n).padStart(3, '0')}`
}

export function nextEventId() {
  const events = getEvents()
  const n = events.length + 1
  return `evt_${String(n).padStart(3, '0')}`
}

// --- Reset (dev/testing) ---
export function resetAll() {
  localStorage.removeItem(KEYS.event)
  localStorage.removeItem(KEYS.pics)
  localStorage.removeItem(KEYS.events)
  localStorage.removeItem(KEYS.seq)
}

export { KEYS }
