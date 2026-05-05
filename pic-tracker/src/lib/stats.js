// lib/stats.js — pure stat computation functions over pics + events.
// All functions accept (pics, events) and return primitives or simple objects.
// No UI; no localStorage access. Easy to unit-test if we ever add tests.

import {
  highestCodeFor,
  elapsedMinutes,
  wasEverCode2,
  normalizeReferredBy,
  normalizeReferredTo,
} from './helpers'

// ---------- helpers internal ----------

function expandList(values, otherValue) {
  // Replace 'Other' with the free-text value when present.
  // Returns an array of human-readable values.
  if (!Array.isArray(values)) {
    if (typeof values === 'string' && values) return [values === 'Other' && otherValue ? otherValue : values]
    return []
  }
  return values.map((v) => (v === 'Other' && otherValue ? otherValue : v))
}

function frequencyMap(items) {
  const m = new Map()
  for (const item of items) {
    if (item == null || item === '') continue
    m.set(item, (m.get(item) || 0) + 1)
  }
  return m
}

function topN(map, n) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }))
}

function allEntries(map) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

// ---------- counts ----------

export function totalPics(pics) {
  return pics.length
}

export function inCareCount(pics) {
  return pics.filter((p) => p.status === 'in_care').length
}

export function dischargedCount(pics) {
  return pics.filter((p) => p.status === 'discharged').length
}

// ---------- time stats ----------

// Returns minutes-in-care for each PIC. Discharged uses leftCare; in-care uses now.
function timesInCare(pics) {
  return pics.map((p) => elapsedMinutes(p.enteredCare, p.leftCare)).filter((n) => n > 0)
}

export function avgTimeInCare(pics) {
  const times = timesInCare(pics)
  if (times.length === 0) return null
  const sum = times.reduce((a, b) => a + b, 0)
  return Math.round(sum / times.length)
}

export function medianTimeInCare(pics) {
  const times = timesInCare(pics).slice().sort((a, b) => a - b)
  if (times.length === 0) return null
  const mid = Math.floor(times.length / 2)
  return times.length % 2 === 0
    ? Math.round((times[mid - 1] + times[mid]) / 2)
    : times[mid]
}

export function longestTimeInCare(pics) {
  const times = timesInCare(pics)
  if (times.length === 0) return null
  return Math.max(...times)
}

// ---------- severity ----------

export function code1IncidentCount(pics, events) {
  // Count of PICs whose log contains any code === 1 event
  const picIds = new Set(pics.map((p) => p.id))
  const code1Pics = new Set()
  for (const e of events) {
    if (!picIds.has(e.picId)) continue
    if ((e.type === 'admit' || e.type === 'code_change') && e.code === 1) {
      code1Pics.add(e.picId)
    }
  }
  return code1Pics.size
}

export function persistentMhCount(pics, events) {
  // PICs ever flagged Code 2
  return pics.filter((p) => wasEverCode2(p.id, events)).length
}

// Distribution of highest-code-reached. Returns array [{code, count}] for codes 1..5.
export function highestCodeDistribution(pics, events) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const p of pics) {
    const h = highestCodeFor(p.id, events)
    if (h != null && dist[h] != null) dist[h]++
  }
  return [1, 2, 3, 4, 5].map((c) => ({ code: c, count: dist[c] }))
}

// ---------- medical ----------

export function medicalInvolvedCount(pics) {
  return pics.filter((p) => p.medicalInvolved === true).length
}

export function medicalInvolvedPct(pics) {
  const eligible = pics.filter((p) => p.medicalInvolved != null) // only count answered Y/N
  if (eligible.length === 0) return null
  const yes = eligible.filter((p) => p.medicalInvolved === true).length
  return Math.round((yes / eligible.length) * 100)
}

// ---------- frequency lists ----------

export function substanceFrequency(pics, n = 5) {
  const all = []
  for (const p of pics) {
    all.push(...expandList(p.substances, p.substanceOther))
  }
  return topN(frequencyMap(all), n)
}

export function presentationFrequency(pics, n = 5) {
  const all = []
  for (const p of pics) {
    all.push(...expandList(p.presentations, p.presentationOther))
  }
  return topN(frequencyMap(all), n)
}

export function outcomeDistribution(pics) {
  // Only discharged PICs have outcomes
  const all = []
  for (const p of pics) {
    if (p.status !== 'discharged') continue
    if (!p.outcome) continue
    all.push(p.outcome === 'Other' && p.outcomeOther ? p.outcomeOther : p.outcome)
  }
  return allEntries(frequencyMap(all))
}

export function referredByDistribution(pics) {
  const all = []
  for (const p of pics) {
    all.push(...expandList(normalizeReferredBy(p), p.referredByOther))
  }
  return allEntries(frequencyMap(all))
}

export function referredToDistribution(pics) {
  const all = []
  for (const p of pics) {
    if (p.status !== 'discharged') continue
    all.push(...expandList(normalizeReferredTo(p), p.referredToOther))
  }
  return allEntries(frequencyMap(all))
}

// ---------- one-shot computation for the dashboard / reports ----------

export function computeAllStats(pics, events) {
  return {
    counts: {
      total: totalPics(pics),
      inCare: inCareCount(pics),
      discharged: dischargedCount(pics),
    },
    times: {
      avg: avgTimeInCare(pics),
      median: medianTimeInCare(pics),
      longest: longestTimeInCare(pics),
    },
    severity: {
      code1: code1IncidentCount(pics, events),
      persistentMh: persistentMhCount(pics, events),
      highestCodeDistribution: highestCodeDistribution(pics, events),
    },
    medical: {
      count: medicalInvolvedCount(pics),
      pct: medicalInvolvedPct(pics),
    },
    frequencies: {
      substances: substanceFrequency(pics, 5),
      presentations: presentationFrequency(pics, 5),
      outcomes: outcomeDistribution(pics),
      referredBy: referredByDistribution(pics),
      referredTo: referredToDistribution(pics),
    },
  }
}
