// lib/supabaseStore.js — parallel async API mirroring store.js and the mutation
// functions in helpers.js. The dualStore layer calls into here for the Supabase
// half of dual-write.
//
// All functions are async and return Promises. On Supabase config absence or
// network failure, they log and resolve with null/empty rather than throw —
// dual-write must never break the localStorage path.

import { supabase, SUPABASE_CONFIGURED, withCodes } from './supabaseClient'
import { getSession } from './eventSession'
import { generateCode } from './codeGen'

// ---------- Helpers ----------

function clientForSession() {
  if (!SUPABASE_CONFIGURED) return null
  const s = getSession()
  if (s.role === 'writer') return withCodes({ writerCode: s.writerCode, viewerCode: s.viewerCode })
  if (s.role === 'viewer') return withCodes({ viewerCode: s.viewerCode })
  return null
}

function logError(where, err) {
  if (!err) return
  // eslint-disable-next-line no-console
  console.error(`[supabaseStore] ${where}:`, err.message || err)
}

// ---------- snake_case <-> camelCase translation ----------
// Done explicitly per-table so the field list is documented and review-able.

function eventFromDb(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    writerCode: row.writer_code,
    viewerCode: row.viewer_code,
    shift1Team: row.shift1_team || [],
    shift2Team: row.shift2_team || [],
    code3CheckIntervalMinutes: row.code3_check_interval_minutes,
    capacity: row.capacity,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function eventToDb(e) {
  const out = {}
  if ('name' in e) out.name = e.name
  if ('writerCode' in e) out.writer_code = e.writerCode
  if ('viewerCode' in e) out.viewer_code = e.viewerCode
  if ('shift1Team' in e) out.shift1_team = e.shift1Team
  if ('shift2Team' in e) out.shift2_team = e.shift2Team
  if ('code3CheckIntervalMinutes' in e) out.code3_check_interval_minutes = e.code3CheckIntervalMinutes
  if ('capacity' in e) out.capacity = e.capacity
  if ('isActive' in e) out.is_active = e.isActive
  return out
}

function picFromDb(row) {
  if (!row) return null
  return {
    id: row.id, // Supabase UUID — different from localStorage `pic_001` IDs
    eventId: row.event_id,
    number: row.number,
    name: row.name,
    gender: row.gender,
    ageRange: row.age_range,
    description: row.description,
    enteredCare: row.entered_care,
    leftCare: row.left_care,
    referredBy: row.referred_by || [],
    referredByOther: row.referred_by_other,
    substances: row.substances || [],
    substanceOther: row.substance_other,
    presentations: row.presentations || [],
    presentationOther: row.presentation_other,
    intakeKpe: row.intake_kpe,
    assignedKpe: row.assigned_kpe,
    outcome: row.outcome,
    outcomeOther: row.outcome_other,
    referredTo: row.referred_to || [],
    referredToOther: row.referred_to_other,
    medicalInvolved: row.medical_involved,
    lastKpe: row.last_kpe,
    tlSignoff: row.tl_signoff,
    ejectionFlag: row.ejection_flag,
    securityNotified: row.security_notified,
    status: row.status,
  }
}

function picToDb(p, eventId) {
  const out = {}
  if (eventId) out.event_id = eventId
  if ('number' in p) out.number = p.number
  if ('name' in p) out.name = p.name
  if ('gender' in p) out.gender = p.gender
  if ('ageRange' in p) out.age_range = p.ageRange
  if ('description' in p) out.description = p.description
  if ('enteredCare' in p) out.entered_care = p.enteredCare
  if ('leftCare' in p) out.left_care = p.leftCare
  if ('referredBy' in p) out.referred_by = p.referredBy || []
  if ('referredByOther' in p) out.referred_by_other = p.referredByOther
  if ('substances' in p) out.substances = p.substances || []
  if ('substanceOther' in p) out.substance_other = p.substanceOther
  if ('presentations' in p) out.presentations = p.presentations || []
  if ('presentationOther' in p) out.presentation_other = p.presentationOther
  if ('intakeKpe' in p) out.intake_kpe = p.intakeKpe
  if ('assignedKpe' in p) out.assigned_kpe = p.assignedKpe
  if ('outcome' in p) out.outcome = p.outcome
  if ('outcomeOther' in p) out.outcome_other = p.outcomeOther
  if ('referredTo' in p) out.referred_to = p.referredTo || []
  if ('referredToOther' in p) out.referred_to_other = p.referredToOther
  if ('medicalInvolved' in p) out.medical_involved = p.medicalInvolved
  if ('lastKpe' in p) out.last_kpe = p.lastKpe
  if ('tlSignoff' in p) out.tl_signoff = p.tlSignoff
  if ('ejectionFlag' in p) out.ejection_flag = !!p.ejectionFlag
  if ('securityNotified' in p) out.security_notified = p.securityNotified
  if ('status' in p) out.status = p.status
  return out
}

function activityFromDb(row) {
  if (!row) return null
  return {
    id: row.id,
    eventId: row.event_id,
    picId: row.pic_id,
    timestamp: row.timestamp,
    type: row.type,
    code: row.code,
    kpe: row.kpe,
    note: row.note,
    meta: row.meta || {},
  }
}

function activityToDb(e, eventId, picUuid) {
  return {
    event_id: eventId,
    pic_id: picUuid,
    timestamp: e.timestamp,
    type: e.type,
    code: e.code ?? null,
    kpe: e.kpe ?? null,
    note: e.note ?? null,
    meta: e.meta || {},
  }
}

// ---------- Event lifecycle ----------

// Create a new event in Supabase. Generates writer/viewer codes if not provided.
// Returns the created event (with codes) or null on failure.
// Used by the "Create event" flow on the landing screen.
export async function createEvent({ name, shift1Team = [], shift2Team = [], capacity = null }) {
  if (!supabase) {
    logError('createEvent', 'Supabase not configured')
    return null
  }
  // Generate unique codes, retry on collision (rare but possible).
  for (let attempt = 0; attempt < 5; attempt++) {
    const writerCode = generateCode(6)
    const viewerCode = generateCode(6)
    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          name: name || '',
          writer_code: writerCode,
          viewer_code: viewerCode,
          shift1_team: shift1Team,
          shift2_team: shift2Team,
          capacity,
          is_active: true,
        },
      ])
      .select()
      .single()
    if (!error) return eventFromDb(data)
    // 23505 = unique_violation. Retry with new codes.
    if (error.code === '23505') continue
    logError('createEvent', error)
    return null
  }
  logError('createEvent', 'Code generation collided 5 times — giving up')
  return null
}

// Join an existing event by code. Looks up the event row and returns it +
// detected role ('writer' or 'viewer') based on which field the code matched.
// Returns null if the code doesn't match any event.
export async function joinEventByCode(code) {
  if (!supabase) return null
  const normalized = (code || '').toUpperCase().trim()
  if (!normalized) return null

  // Try as a writer code first.
  {
    const sb = withCodes({ writerCode: normalized })
    const { data, error } = await sb
      .from('events')
      .select('*')
      .eq('writer_code', normalized)
      .maybeSingle()
    if (!error && data) return { event: eventFromDb(data), role: 'writer' }
  }

  // Then as a viewer code.
  {
    const sb = withCodes({ viewerCode: normalized })
    const { data, error } = await sb
      .from('events')
      .select('*')
      .eq('viewer_code', normalized)
      .maybeSingle()
    if (!error && data) return { event: eventFromDb(data), role: 'viewer' }
  }

  return null
}

// Load the current event for this session.
export async function getCurrentEvent() {
  const sb = clientForSession()
  if (!sb) return null
  const s = getSession()
  if (!s.eventId) return null
  const { data, error } = await sb.from('events').select('*').eq('id', s.eventId).maybeSingle()
  if (error) {
    logError('getCurrentEvent', error)
    return null
  }
  return eventFromDb(data)
}

// Update the current event. Writer-only (RLS enforced).
export async function updateCurrentEvent(patch) {
  const sb = clientForSession()
  if (!sb) return null
  const s = getSession()
  if (!s.eventId || s.role !== 'writer') return null
  const { data, error } = await sb
    .from('events')
    .update(eventToDb(patch))
    .eq('id', s.eventId)
    .select()
    .single()
  if (error) {
    logError('updateCurrentEvent', error)
    return null
  }
  return eventFromDb(data)
}

// ---------- PICs ----------

export async function getPicsForCurrentEvent() {
  const sb = clientForSession()
  if (!sb) return []
  const s = getSession()
  if (!s.eventId) return []
  const { data, error } = await sb
    .from('pics')
    .select('*')
    .eq('event_id', s.eventId)
    .order('number', { ascending: true })
  if (error) {
    logError('getPicsForCurrentEvent', error)
    return []
  }
  return (data || []).map(picFromDb)
}

// Find an existing Supabase PIC row by (event_id, number). Used by dual-write
// to translate localStorage's `pic_001`-style IDs to Supabase UUIDs when
// adding activity log entries after the PIC's been created.
export async function findPicUuidByNumber(number) {
  const sb = clientForSession()
  if (!sb) return null
  const s = getSession()
  if (!s.eventId) return null
  const { data, error } = await sb
    .from('pics')
    .select('id')
    .eq('event_id', s.eventId)
    .eq('number', number)
    .maybeSingle()
  if (error) {
    logError('findPicUuidByNumber', error)
    return null
  }
  return data?.id || null
}

// Insert a new PIC. Returns the created row (with Supabase UUID) or null.
export async function insertPic(pic) {
  const sb = clientForSession()
  if (!sb) return null
  const s = getSession()
  if (!s.eventId || s.role !== 'writer') return null
  const { data, error } = await sb
    .from('pics')
    .insert([picToDb(pic, s.eventId)])
    .select()
    .single()
  if (error) {
    logError('insertPic', error)
    return null
  }
  return picFromDb(data)
}

// Update a PIC by `number` (because the dual-write layer doesn't know the UUID).
export async function updatePicByNumber(number, patch) {
  const sb = clientForSession()
  if (!sb) return null
  const s = getSession()
  if (!s.eventId || s.role !== 'writer') return null
  const { data, error } = await sb
    .from('pics')
    .update(picToDb(patch))
    .eq('event_id', s.eventId)
    .eq('number', number)
    .select()
    .single()
  if (error) {
    logError('updatePicByNumber', error)
    return null
  }
  return picFromDb(data)
}

// ---------- Activity log ----------

export async function getActivityForCurrentEvent() {
  const sb = clientForSession()
  if (!sb) return []
  const s = getSession()
  if (!s.eventId) return []
  const { data, error } = await sb
    .from('activity_log')
    .select('*')
    .eq('event_id', s.eventId)
    .order('timestamp', { ascending: true })
  if (error) {
    logError('getActivityForCurrentEvent', error)
    return []
  }
  return (data || []).map(activityFromDb)
}

// Insert an activity log entry. Needs the PIC's Supabase UUID, so the caller
// should look it up via findPicUuidByNumber if working from a localStorage PIC.
export async function insertActivity(evt, picUuid) {
  const sb = clientForSession()
  if (!sb) return null
  const s = getSession()
  if (!s.eventId || s.role !== 'writer') return null
  if (!picUuid) {
    logError('insertActivity', 'no picUuid')
    return null
  }
  const { data, error } = await sb
    .from('activity_log')
    .insert([activityToDb(evt, s.eventId, picUuid)])
    .select()
    .single()
  if (error) {
    logError('insertActivity', error)
    return null
  }
  return activityFromDb(data)
}
