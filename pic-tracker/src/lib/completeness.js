// lib/completeness.js — determine what's missing from a PIC record.
//
// Two states matter:
//  - in_care:    flag if essential intake info is missing
//  - discharged: flag if intake AND discharge info is missing
//
// Returns { complete, missing, missingFields }:
//   - missing:        string[] human-readable labels (for tooltips / summary)
//   - missingFields:  Set<string> stable field keys (for per-section highlighting)
//
// Field keys (stable, used by UI):
//   'identifier'    — name or description
//   'assignedKpe'   — assigned KPE
//   'substancesOrPresentations' — at least one of either
//   'outcome'       — discharge outcome
//   'referredTo'    — discharge referred-to
//   'medicalInvolved' — discharge medical Y/N
//   'tlSignoff'     — discharge TL sign-off
//   'securityNotified' — only if ejection flag set

import { getAssignedKpe, normalizeReferredTo } from './helpers'

export function completenessFor(pic) {
  if (!pic) return { complete: true, missing: [], missingFields: new Set() }
  const missing = []
  const missingFields = new Set()

  // --- Intake-level checks (apply to both in-care and discharged) ---

  const hasName = !!(pic.name && pic.name.trim())
  const hasDescription = !!(pic.description && pic.description.trim())
  if (!hasName && !hasDescription) {
    missing.push('Identifier (name or description)')
    missingFields.add('identifier')
  }

  if (!getAssignedKpe(pic)) {
    missing.push('Assigned KPE')
    missingFields.add('assignedKpe')
  }

  const subs = Array.isArray(pic.substances) ? pic.substances : []
  const pres = Array.isArray(pic.presentations) ? pic.presentations : []
  if (subs.length === 0 && pres.length === 0) {
    missing.push('Substances / presentations')
    missingFields.add('substancesOrPresentations')
  }

  // --- Discharge-level checks ---

  if (pic.status === 'discharged') {
    if (!pic.outcome) {
      missing.push('Outcome')
      missingFields.add('outcome')
    }
    if (normalizeReferredTo(pic).length === 0) {
      missing.push('Referred to')
      missingFields.add('referredTo')
    }
    if (pic.medicalInvolved == null) {
      missing.push('Medical involvement')
      missingFields.add('medicalInvolved')
    }
    if (!pic.tlSignoff) {
      missing.push('TL sign-off')
      missingFields.add('tlSignoff')
    }
    if (pic.ejectionFlag && pic.securityNotified == null) {
      missing.push('Security/RSA notification')
      missingFields.add('securityNotified')
    }
  }

  return { complete: missing.length === 0, missing, missingFields }
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
