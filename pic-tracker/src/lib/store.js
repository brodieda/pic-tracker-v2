// store.js — localStorage wrapper for PIC Tracker
// Three top-level keys: pic_event, pic_pics, pic_events

const KEYS = {
  event: 'pic_event',
  pics: 'pic_pics',
  events: 'pic_events',
}

const DEFAULT_EVENT = {
  name: '',
  shift1Team: [],
  shift2Team: [],
  code3CheckIntervalMinutes: 15,
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

// --- ID helpers ---
export function nextPicId() {
  const pics = getPics()
  const n = pics.length + 1
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
}

export { KEYS }
