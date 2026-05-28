// lib/supabaseStore.js — async API mirroring localStorage store and helpers.
// Uses the single global supabase client; auth context comes from the JWT
// automatically, no header injection.

import { supabase, SUPABASE_CONFIGURED } from './supabaseClient'
import { getSession, setSessionData } from './eventSession'

function logError(where, err) {
  if (!err) return
  // eslint-disable-next-line no-console
  console.error(`[supabaseStore] ${where}:`, err.message || err)
}

// ---------- Translation ----------

function eventFromDb(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    writerCode: row.writer_code,
    viewerCode: row.viewer_code,
    admitCode: row.admit_code,
    shift1Team: row.shift1_team || [],
    shift2Team: row.shift2_team || [],
    code3CheckIntervalMinutes: row.code3_check_interval_minutes,
    capacity: row.capacity,
    isActive: row.is_active,
  }
}

function eventToDb(e) {
  const out = {}
  if ('name' in e) out.name = e.name
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
    id: row.id,
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
    source: row.source || 'writer',
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
  if ('source' in p) out.source = p.source
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

// ---------- Auth flow ----------

// Sign in anonymously + bind the session to an event by code.
// Returns { event, role } on success, throws on failure.
export async function joinByCode(code) {
  if (!supabase) throw new Error('Supabase not configured')
  const normalized = (code || '').toUpperCase().trim()
  if (!normalized) throw new Error('Empty code')

  // 1. Sign in anonymously (creates a Supabase auth user if not signed in already).
  const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
  if (signInError) {
    logError('signInAnonymously', signInError)
    throw signInError
  }

  // 2. Call RPC to set our metadata. This SECURITY DEFINER function verifies
  //    the code and binds event_id + role to our auth user.
  const { data: bindData, error: bindError } = await supabase.rpc('set_session_event_metadata', {
    p_code: normalized,
  })
  if (bindError) {
    logError('set_session_event_metadata', bindError)
    // Sign out so we don't leave a half-bound session lying around
    await supabase.auth.signOut()
    throw bindError
  }
  const binding = Array.isArray(bindData) ? bindData[0] : bindData
  if (!binding) {
    await supabase.auth.signOut()
    throw new Error('Invalid code')
  }

  // 3. Refresh the session so the new app_metadata appears in the JWT.
  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    logError('refreshSession', refreshError)
    // Non-fatal: continue, the next request will pick up the JWT.
  }

  // 4. Look up the full event row (RLS will now allow this since we have the JWT).
  const { data: evRow, error: evError } = await supabase
    .from('events')
    .select('*')
    .eq('id', binding.event_id)
    .single()
  if (evError) {
    logError('joinByCode load event', evError)
    throw evError
  }
  const event = eventFromDb(evRow)

  // 5. Cache the session locally for fast UI checks. Only expose codes the
  //    role is allowed to see.
  setSessionData({
    role: binding.role,
    eventId: event.id,
    eventName: event.name,
    writerCode: binding.role === 'writer' ? event.writerCode : null,
    viewerCode: binding.role === 'writer' || binding.role === 'viewer' ? event.viewerCode : null,
    admitCode: binding.role === 'writer' ? event.admitCode : null,
  })

  return { event, role: binding.role }
}

// Create a new event and join as writer. Generates codes server-side.
export async function createEventAndJoin({ name, shift1Team = [], shift2Team = [], capacity = null }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('create_event_with_codes', {
    p_name: name || '',
    p_shift1: shift1Team,
    p_shift2: shift2Team,
    p_capacity: capacity,
  })
  if (error) {
    logError('create_event_with_codes', error)
    throw error
  }
  const created = Array.isArray(data) ? data[0] : data
  if (!created) throw new Error('Event creation returned no rows')

  // Now join with the writer code so our session gets bound.
  const result = await joinByCode(created.writer_code)
  return result
}

// ---------- Standard reads/writes ----------

export async function getCurrentEvent() {
  if (!supabase) return null
  const s = getSession()
  if (!s.eventId) return null
  const { data, error } = await supabase.from('events').select('*').eq('id', s.eventId).maybeSingle()
  if (error) { logError('getCurrentEvent', error); return null }
  return eventFromDb(data)
}

export async function updateCurrentEvent(patch) {
  if (!supabase) return null
  const s = getSession()
  if (!s.eventId || s.role !== 'writer') return null
  const { data, error } = await supabase
    .from('events')
    .update(eventToDb(patch))
    .eq('id', s.eventId)
    .select()
    .single()
  if (error) { logError('updateCurrentEvent', error); return null }
  return eventFromDb(data)
}

// End event = set is_active = false. Writer only.
export async function endCurrentEvent() {
  if (!supabase) return null
  const s = getSession()
  if (!s.eventId || s.role !== 'writer') return null
  const { data, error } = await supabase
    .from('events')
    .update({ is_active: false })
    .eq('id', s.eventId)
    .select()
    .single()
  if (error) { logError('endCurrentEvent', error); return null }
  return eventFromDb(data)
}

export async function getPicsForCurrentEvent() {
  if (!supabase) return []
  const s = getSession()
  if (!s.eventId) return []
  const { data, error } = await supabase
    .from('pics')
    .select('*')
    .eq('event_id', s.eventId)
    .order('number', { ascending: true })
  if (error) { logError('getPicsForCurrentEvent', error); return [] }
  return (data || []).map(picFromDb)
}

export async function findPicUuidByNumber(number) {
  if (!supabase) return null
  const s = getSession()
  if (!s.eventId) return null
  const { data, error } = await supabase
    .from('pics')
    .select('id')
    .eq('event_id', s.eventId)
    .eq('number', number)
    .maybeSingle()
  if (error) { logError('findPicUuidByNumber', error); return null }
  return data?.id || null
}

// Insert a PIC. The frontend passes source as part of the pic object.
// RLS will allow writer→writer-source, intake_only→intake_only-source.
export async function insertPic(pic) {
  if (!supabase) return null
  const s = getSession()
  if (!s.eventId) return null
  const { data, error } = await supabase
    .from('pics')
    .insert([picToDb(pic, s.eventId)])
    .select()
    .single()
  if (error) { logError('insertPic', error); return null }
  return picFromDb(data)
}

export async function updatePicByNumber(number, patch) {
  if (!supabase) return null
  const s = getSession()
  if (!s.eventId || s.role !== 'writer') return null
  const { data, error } = await supabase
    .from('pics')
    .update(picToDb(patch))
    .eq('event_id', s.eventId)
    .eq('number', number)
    .select()
    .single()
  if (error) { logError('updatePicByNumber', error); return null }
  return picFromDb(data)
}

export async function getActivityForCurrentEvent() {
  if (!supabase) return []
  const s = getSession()
  if (!s.eventId) return []
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('event_id', s.eventId)
    .order('timestamp', { ascending: true })
  if (error) { logError('getActivityForCurrentEvent', error); return [] }
  return (data || []).map(activityFromDb)
}

export async function insertActivity(evt, picUuid) {
  if (!supabase) return null
  const s = getSession()
  if (!s.eventId) return null
  if (!picUuid) { logError('insertActivity', 'no picUuid'); return null }
  const { data, error } = await supabase
    .from('activity_log')
    .insert([activityToDb(evt, s.eventId, picUuid)])
    .select()
    .single()
  if (error) { logError('insertActivity', error); return null }
  return activityFromDb(data)
}
