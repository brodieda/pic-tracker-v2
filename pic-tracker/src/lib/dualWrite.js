// lib/dualWrite.js — fire-and-forget Supabase mirrors of localStorage mutations.
//
// Every helpers.js mutator calls one of these functions AFTER its localStorage
// write succeeds. The Supabase write is async, non-blocking, and silently
// no-ops if:
//   - Supabase isn't configured (no env vars)
//   - The device hasn't joined an event yet
//   - The device is a viewer (no write access)
//
// localStorage remains the source of truth for reads. Supabase is a mirror
// for the dual-write phase. We'll flip the read side in a later phase.

import { SUPABASE_CONFIGURED } from './supabaseClient'
import { getSession, isWriter } from './eventSession'
import {
  insertPic,
  updatePicByNumber,
  insertActivity,
  findPicUuidByNumber,
} from './supabaseStore'

// Quick guard — every dual-write helper short-circuits if these conditions aren't met.
function shouldMirror() {
  if (!SUPABASE_CONFIGURED) return false
  if (!isWriter()) return false
  if (!getSession().eventId) return false
  return true
}

// Cache: localStorage PIC number → Supabase UUID. Lets activity inserts skip the
// lookup once we've created the PIC. In-memory only; rebuilt on page load.
const uuidByNumber = new Map()

function rememberUuid(number, uuid) {
  if (number != null && uuid) uuidByNumber.set(number, uuid)
}

async function resolveUuid(number) {
  if (uuidByNumber.has(number)) return uuidByNumber.get(number)
  const uuid = await findPicUuidByNumber(number)
  if (uuid) rememberUuid(number, uuid)
  return uuid
}

// Public: hint to the cache from caller-side data we already have.
export function rememberPicUuid(number, uuid) {
  rememberUuid(number, uuid)
}

// Strip the localStorage-only `id` field before sending — Supabase generates its own UUID.
function stripLocalId(pic) {
  const { id, ...rest } = pic
  return rest
}

// ---------- Mirror operations ----------

export function mirrorAdmit(pic, admitEvent) {
  if (!shouldMirror()) return
  // Fire and forget.
  ;(async () => {
    try {
      const created = await insertPic(stripLocalId(pic))
      if (!created) return
      rememberUuid(pic.number, created.id)
      if (admitEvent) {
        await insertActivity(admitEvent, created.id)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[dualWrite] mirrorAdmit failed:', e)
    }
  })()
}

export function mirrorPicUpdate(picNumber, patch) {
  if (!shouldMirror()) return
  ;(async () => {
    try {
      await updatePicByNumber(picNumber, patch)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[dualWrite] mirrorPicUpdate failed:', e)
    }
  })()
}

export function mirrorActivity(picNumber, evt) {
  if (!shouldMirror()) return
  ;(async () => {
    try {
      const uuid = await resolveUuid(picNumber)
      if (!uuid) return
      await insertActivity(evt, uuid)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[dualWrite] mirrorActivity failed:', e)
    }
  })()
}

// Combined: PIC update + activity event in the same logical operation.
export function mirrorPicUpdateWithActivity(picNumber, patch, evt) {
  if (!shouldMirror()) return
  ;(async () => {
    try {
      const uuid = await resolveUuid(picNumber)
      await updatePicByNumber(picNumber, patch)
      if (evt && uuid) {
        await insertActivity(evt, uuid)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[dualWrite] mirrorPicUpdateWithActivity failed:', e)
    }
  })()
}
