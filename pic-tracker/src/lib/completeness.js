// lib/completeness.js — determine what's missing from a PIC record.
//
// Two states matter:
//  - in_care:    flag if essential intake info is missing
//  - discharged: flag if intake AND discharge info is missing
//
// Returns { complete: bool, missing: string[] } — `missing` is human-readable labels.

import { getAssignedKpe, normalizeReferredTo } from './helpers'

export function completenessFor(pic) {
  if (!pic) return { complete: true, missing: [] }
  const missing = []

  // --- Intake-level checks (apply to both in-care and discharged) ---

  // Need at least one identifier beyond #
  const hasName = !!(pic.name && pic.name.trim())
  const hasDescription = !!(pic.description && pic.description.trim())
  if (!hasName && !hasDescription) {
    missing.push('Identifier (name or description)')
  }

  // KPE assignment
  if (!getAssignedKpe(pic)) {
    missing.push('Assigned KPE')
  }

  // Need at least one substance or presentation observed
  const subs = Array.isArray(pic.substances) ? pic.substances : []
  const pres = Array.isArray(pic.presentations) ? pic.presentations : []
  if (subs.length === 0 && pres.length === 0) {
    missing.push('Substances / presentations')
  }

  // --- Discharge-level checks ---

  if (pic.status === 'discharged') {
    if (!pic.outcome) missing.push('Outcome')
    if (normalizeReferredTo(pic).length === 0) missing.push('Referred to')
    if (pic.medicalInvolved == null) missing.push('Medical involvement')
    if (!pic.tlSignoff) missing.push('TL sign-off')
  }

  return { complete: missing.length === 0, missing }
}

// Quick boolean check
export function isIncomplete(pic) {
  return !completenessFor(pic).complete
}

// Count of incomplete records in a given set
export function incompleteCount(pics) {
  if (!pics) return 0
  return pics.filter(isIncomplete).length
}
