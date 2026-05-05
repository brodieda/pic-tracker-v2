// lib/xlsxExport.js — SheetJS-based two-sheet export.
// Uses dynamic import for the xlsx library so it isn't loaded until the user clicks Export.

import {
  highestCodeFor,
  elapsedMinutes,
  getAssignedKpe,
  normalizeReferredBy,
  normalizeReferredTo,
  formatDateTime,
} from './helpers'

// --- helpers ---

function expandList(values, otherValue) {
  const list = Array.isArray(values) ? values : values ? [values] : []
  return list.map((v) => (v === 'Other' && otherValue ? otherValue : v))
}

function joinList(values, otherValue) {
  return expandList(values, otherValue).join(', ')
}

function bool(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return ''
}

function slugifyEventName(name) {
  if (!name) return 'untitled'
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled'
}

function todayStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// --- PIC row builder ---

function buildPicRow(pic, events) {
  const highest = highestCodeFor(pic.id, events)
  const minutes = elapsedMinutes(pic.enteredCare, pic.leftCare)
  return {
    'PIC #': pic.number ?? '',
    'Name': pic.name || '',
    'Description': pic.description || '',
    'Gender': pic.gender || '',
    'Age range': pic.ageRange || '',
    'Entered care': pic.enteredCare ? formatDateTime(pic.enteredCare) : '',
    'Left care': pic.leftCare ? formatDateTime(pic.leftCare) : '',
    'Minutes in care': minutes || '',
    'Highest code': highest ?? '',
    'Referred by': joinList(normalizeReferredBy(pic), pic.referredByOther),
    'Substances': joinList(pic.substances, pic.substanceOther),
    'Presentations': joinList(pic.presentations, pic.presentationOther),
    'Outcome': pic.outcome === 'Other' ? pic.outcomeOther || 'Other' : pic.outcome || '',
    'Referred to': joinList(normalizeReferredTo(pic), pic.referredToOther),
    'Medical involved': bool(pic.medicalInvolved),
    'Assigned KPE': getAssignedKpe(pic) || '',
    'Last KPE': pic.lastKpe || '',
    'TL sign-off': pic.tlSignoff || '',
    'Status': pic.status || '',
  }
}

// --- Event row builder ---

function picNumberById(picId, pics) {
  const p = pics.find((x) => x.id === picId)
  return p?.number ?? ''
}

function buildEventRow(evt, pics) {
  return {
    'Event ID': evt.id,
    'PIC #': picNumberById(evt.picId, pics),
    'Timestamp': evt.timestamp ? formatDateTime(evt.timestamp) : '',
    'Type': evt.type,
    'Code': evt.code ?? '',
    'KPE': evt.kpe || '',
    'Note': evt.note || '',
    'Meta': evt.meta && Object.keys(evt.meta).length > 0 ? JSON.stringify(evt.meta) : '',
  }
}

// --- Column width hints (rough, makes the file readable in Excel/Numbers) ---

function fitColumns(rows) {
  if (!rows || rows.length === 0) return []
  const headers = Object.keys(rows[0])
  return headers.map((h) => {
    const headerLen = h.length
    const maxBodyLen = rows.reduce((max, r) => {
      const v = r[h] == null ? '' : String(r[h])
      return Math.max(max, v.length)
    }, 0)
    return { wch: Math.min(50, Math.max(headerLen, maxBodyLen) + 2) }
  })
}

// --- Public API ---

/**
 * Export the given PICs and events to an XLSX file. Triggers browser download.
 *
 * @param {object} args
 * @param {Array} args.pics - array of PIC records to include in the PICs sheet
 * @param {Array} args.events - full events log (will be filtered to PICs in args.pics)
 * @param {object} args.eventCfg - event config (used for filename slug)
 * @param {string} args.cohortLabel - 'discharged' | 'all' for the filename suffix
 */
export async function exportXlsx({ pics, events, eventCfg, cohortLabel = 'all' }) {
  // Lazy-load SheetJS to keep the main bundle small
  const XLSX = await import('xlsx')

  // Filter events to only those tied to the included PICs
  const includedIds = new Set(pics.map((p) => p.id))
  const includedEvents = (events || []).filter((e) => includedIds.has(e.picId))

  const picRows = pics.map((p) => buildPicRow(p, events))
  const eventRows = includedEvents
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((e) => buildEventRow(e, pics))

  const wb = XLSX.utils.book_new()

  const picsSheet = XLSX.utils.json_to_sheet(picRows)
  picsSheet['!cols'] = fitColumns(picRows)
  XLSX.utils.book_append_sheet(wb, picsSheet, 'PICs')

  const eventsSheet = XLSX.utils.json_to_sheet(eventRows)
  eventsSheet['!cols'] = fitColumns(eventRows)
  XLSX.utils.book_append_sheet(wb, eventsSheet, 'Events')

  const filename = `pic-tracker-${slugifyEventName(eventCfg?.name)}-${todayStamp()}-${cohortLabel}.xlsx`

  XLSX.writeFile(wb, filename)
  return { filename, picCount: picRows.length, eventCount: eventRows.length }
}
