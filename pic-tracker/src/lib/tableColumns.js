// Per-device table preferences: which board view (cards/table), and which
// columns are visible in each table. All localStorage — personal to the
// device/user, synced nowhere, like the theme + font-size settings.

const VIEW_KEY = 'pic_board_view'

export function getBoardView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}
export function setBoardView(v) {
  try {
    localStorage.setItem(VIEW_KEY, v === 'table' ? 'table' : 'cards')
  } catch {
    /* ignore */
  }
}

// key: column id. locked: can't be hidden. web/mob: default-on for that viewport.
export const IN_CARE_COLUMNS = [
  { key: 'number', label: '#', locked: true, web: true, mob: true },
  { key: 'code', label: 'Code', locked: true, web: true, mob: true },
  { key: 'name', label: 'Name', locked: true, web: true, mob: true },
  { key: 'description', label: 'Description', web: true, mob: true },
  { key: 'ga', label: 'Gender / age', web: true, mob: true },
  { key: 'kpe', label: 'KPE', web: true, mob: true },
  { key: 'refBy', label: 'Referred by', web: true, mob: false },
  { key: 'substances', label: 'Substances', web: true, mob: false },
  { key: 'presentations', label: 'Presentations', web: false, mob: false },
  { key: 'time', label: 'Time in care', web: true, mob: true },
  { key: 'flags', label: 'Flags', web: true, mob: false },
]

export const DISCHARGED_COLUMNS = [
  { key: 'number', label: '#', locked: true, web: true, mob: true },
  { key: 'name', label: 'Name', locked: true, web: true, mob: true },
  { key: 'ga', label: 'Gender / age', web: true, mob: true },
  { key: 'timeOut', label: 'Time out', web: true, mob: true },
  { key: 'duration', label: 'Time in care', web: true, mob: true },
  { key: 'outcome', label: 'Outcome', web: true, mob: true },
  { key: 'kpe', label: 'Last KPE', web: false, mob: false },
  { key: 'medical', label: 'Medical', web: false, mob: false },
  { key: 'refTo', label: 'Referred to', web: false, mob: false },
  { key: 'secNotified', label: 'Sec notified', web: false, mob: false },
  { key: 'tlSignoff', label: 'TL sign-off', web: false, mob: false },
]

export const AUDIT_COLUMNS = [
  { key: 'number', label: '#', locked: true, web: true, mob: true },
  { key: 'code', label: 'Code', web: true, mob: true },
  { key: 'highestCode', label: 'Highest code', web: true, mob: false },
  { key: 'name', label: 'Name / desc', web: true, mob: true },
  { key: 'kpe', label: 'KPE', web: true, mob: true },
  { key: 'timeIn', label: 'Time in', web: true, mob: true },
  { key: 'timeOut', label: 'Time out', web: true, mob: false },
  { key: 'refBy', label: 'Referred by', web: true, mob: false },
  { key: 'substances', label: 'Substances', web: true, mob: false },
  { key: 'presentations', label: 'Presentations', web: true, mob: false },
  { key: 'outcome', label: 'Outcome', web: true, mob: false },
  { key: 'refTo', label: 'Referred to', web: true, mob: false },
  { key: 'tlSignoff', label: 'TL sign-off', web: true, mob: false },
]

const COLS = { incare: IN_CARE_COLUMNS, discharged: DISCHARGED_COLUMNS, audit: AUDIT_COLUMNS }
const colsKey = (t) => `pic_table_cols_${t}`

function isMobile() {
  try {
    return window.matchMedia('(max-width: 639px)').matches
  } catch {
    return false
  }
}

// First-run defaults depend on viewport (mobile shows fewer columns).
export function defaultVisible(tableKey) {
  const mobile = isMobile()
  return COLS[tableKey].filter((c) => c.locked || (mobile ? c.mob : c.web)).map((c) => c.key)
}

export function getVisibleColumns(tableKey) {
  try {
    const raw = localStorage.getItem(colsKey(tableKey))
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return arr
    }
  } catch {
    /* fall through to defaults */
  }
  return defaultVisible(tableKey)
}

export function setVisibleColumns(tableKey, keys) {
  try {
    localStorage.setItem(colsKey(tableKey), JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}

export function columnsFor(tableKey) {
  return COLS[tableKey]
}
