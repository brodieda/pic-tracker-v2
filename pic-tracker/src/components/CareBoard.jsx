import { useEffect, useState } from 'react'
import TableBoard from './TableBoard'
import { getBoardView, setBoardView } from '../lib/tableColumns'
import { getPics, getEvents, getEvent, saveEvent } from '../lib/store'
import { updateCurrentEvent } from '../lib/supabaseStore'
import { SUPABASE_CONFIGURED } from '../lib/supabaseClient'
import { isWriter } from '../lib/eventSession'
import PicCard from './PicCard'
import ShieldIcon from './ShieldIcon'
import {
  addCheckEvent,
  getAssignedKpe,
  elapsedMinutes,
  formatElapsed,
  shiftFor,
  workloadFor,
  currentCodeFor,
  code3MonitorStateFor,
  unassignedKpes,
  friendsInsideCount,
} from '../lib/helpers'
import { isIncomplete } from '../lib/completeness'

const CAPACITY_WARNING_THRESHOLD = 3
const SORT_KEY = 'pic_in_care_sort_dir'
const FILTER_KEY = 'pic_in_care_filter_incomplete'

// --- Filter bar ---

function FilterChip({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`text-[11px] font-display font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-md transition whitespace-nowrap ${
        active ? 'bg-ink-100 text-ink-950' : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800'
      }`}
    >
      {children}
    </button>
  )
}

export default function CareBoard({ refreshKey, onAddPic, onPicClick, onPicTapKpe }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [tick, setTick] = useState(0)
  const [view, setView] = useState(() => getBoardView())
  const [sortDir, setSortDir] = useState(() => {
    try {
      return localStorage.getItem(SORT_KEY) || 'desc'
    } catch {
      return 'desc'
    }
  })
  const [filterIncomplete, setFilterIncomplete] = useState(() => {
    try {
      return localStorage.getItem(FILTER_KEY) === '1'
    } catch {
      return false
    }
  })
  const [search, setSearch] = useState('')
  const [filterAcuity, setFilterAcuity] = useState(false)
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const [filterKpe, setFilterKpe] = useState('')

  const reload = () => {
    setPics(getPics())
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    reload()
  }, [refreshKey])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const toggleSort = () => {
    const next = sortDir === 'desc' ? 'asc' : 'desc'
    setSortDir(next)
    try {
      localStorage.setItem(SORT_KEY, next)
    } catch {}
  }

  const toggleFilter = () => {
    const next = !filterIncomplete
    setFilterIncomplete(next)
    try {
      localStorage.setItem(FILTER_KEY, next ? '1' : '0')
    } catch {}
  }

  const onMarkChecked = (pic) => {
    addCheckEvent(pic.id, getAssignedKpe(pic), null)
    reload()
  }

  // Sort in-care purely by PIC number — no code-priority sort. Visual indicators handle priority.
  const inCareAll = pics
    .filter((p) => p.status === 'in_care')
    .slice()
    .sort((a, b) => {
      const an = a.number ?? 0
      const bn = b.number ?? 0
      return sortDir === 'desc' ? bn - an : an - bn
    })

  const incompleteCount = inCareAll.filter(isIncomplete).length

  // Search: matches PIC # or name/description, applies to both columns.
  const searchNorm = search.trim().toLowerCase().replace(/^#/, '')
  const matchesSearch = (p) => {
    if (!searchNorm) return true
    const num = String(p.number ?? '')
    const name = (p.name || '').toLowerCase()
    const desc = (p.description || '').toLowerCase()
    return num.includes(searchNorm) || name.includes(searchNorm) || desc.includes(searchNorm)
  }

  // One-tap filter chips — only meaningful for in-care PICs, AND'd together.
  const matchesChips = (p) => {
    if (filterIncomplete && !isIncomplete(p)) return false
    if (filterAcuity) {
      const code = currentCodeFor(p.id, events)
      if (!(code === 1 || code === 2)) return false
    }
    if (filterOverdue && code3MonitorStateFor(p.id, events, eventCfg) !== 'overdue') return false
    if (filterUnassigned && getAssignedKpe(p)) return false
    if (filterKpe && getAssignedKpe(p) !== filterKpe) return false
    return true
  }

  const anyChipActive = filterIncomplete || filterAcuity || filterOverdue || filterUnassigned || !!filterKpe
  const anyFilterActive = anyChipActive || !!searchNorm

  const inCare = inCareAll.filter((p) => matchesSearch(p) && matchesChips(p))

  const discharged = pics
    .filter((p) => p.status === 'discharged')
    .sort((a, b) => new Date(b.leftCare || 0) - new Date(a.leftCare || 0))
    .filter(matchesSearch)

  const kpeOptions = Array.from(
    new Set([...(eventCfg.shift1Team || []), ...(eventCfg.shift2Team || []), ...unassignedKpes(pics, eventCfg)]),
  )

  const capacity = eventCfg.capacity
  const inCareCount = inCareAll.length
  const countFriends = !!eventCfg.countFriendsInCapacity
  const friendsCount = countFriends ? friendsInsideCount(pics) : 0
  const occupied = inCareCount + friendsCount
  const spacesRemaining = capacity != null ? Math.max(0, capacity - occupied) : null
  const atCapacity = capacity != null && occupied >= capacity
  const nearCapacity =
    capacity != null && !atCapacity && spacesRemaining <= CAPACITY_WARNING_THRESHOLD

  const picsBarPct = capacity > 0 ? Math.min(100, (inCareCount / capacity) * 100) : 0
  const friendsBarPct =
    capacity > 0 ? Math.min(100 - picsBarPct, (friendsCount / capacity) * 100) : 0
  const barColor = atCapacity ? 'bg-code-1' : nearCapacity ? 'bg-code-3' : 'bg-code-5'
  const capacityTextTone = atCapacity ? 'text-code-1' : nearCapacity ? 'text-code-3' : 'text-ink-200'

  const canEditSettings = !!onAddPic // onAddPic is only passed for writers, not viewers
  const onToggleCountFriends = () => {
    const patch = { ...eventCfg, countFriendsInCapacity: !countFriends }
    saveEvent(patch)
    setEventCfg(patch)
    if (SUPABASE_CONFIGURED && isWriter()) {
      updateCurrentEvent(patch).catch((e) => console.error('event mirror failed', e))
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ care board</p>
          <h2 className="text-3xl font-display font-bold">
            {eventCfg.name || 'Untitled event'}
          </h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex bg-ink-800 rounded-lg p-0.5 shrink-0">
            {['cards', 'table'].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v)
                  setBoardView(v)
                }}
                className={`text-xs font-display font-bold px-3 py-1.5 rounded-md capitalize transition ${
                  view === v ? 'bg-ink-100 text-ink-950' : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {capacity != null && (
            <div className="flex flex-col gap-1 w-48 shrink-0">
              <div className="flex items-baseline justify-between">
                <span className={`font-display font-bold text-sm tabular-nums ${capacityTextTone}`}>
                  {occupied}
                  <span className="opacity-50 font-medium"> / {capacity}</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-ink-500">
                  {atCapacity ? 'full' : `${spacesRemaining} ${spacesRemaining === 1 ? 'space' : 'spaces'} free`}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-ink-800 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${barColor} transition-all`}
                  style={{ width: `${picsBarPct}%` }}
                />
                {countFriends && friendsCount > 0 && (
                  <div
                    className="absolute inset-y-0 bg-violet-500/80 transition-all"
                    style={{ left: `${picsBarPct}%`, width: `${friendsBarPct}%` }}
                  />
                )}
              </div>
              {countFriends && (
                <div className="flex items-center gap-2 text-[10px] text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${barColor}`} /> {inCareCount} PICs
                  </span>
                  {friendsCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> {friendsCount} friends
                    </span>
                  )}
                </div>
              )}
              {canEditSettings && (
                <button
                  onClick={onToggleCountFriends}
                  className={`text-left text-[10px] font-display uppercase tracking-widest inline-flex items-center gap-1 ${
                    countFriends ? 'text-violet-400 hover:text-violet-300' : 'text-ink-600 hover:text-ink-300'
                  }`}
                  title="Toggle whether friends/visitors currently inside count toward capacity"
                >
                  <span
                    className={`relative inline-flex items-center h-3.5 w-6 rounded-full transition shrink-0 ${
                      countFriends ? 'bg-violet-500' : 'bg-ink-700'
                    }`}
                  >
                    <span
                      className={`inline-block w-2.5 h-2.5 bg-white rounded-full shadow transform transition ${
                        countFriends ? 'translate-x-3' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  count friends
                </button>
              )}
            </div>
          )}
          {onAddPic && (
            <button onClick={onAddPic} className="btn-primary text-base px-5 py-3">
              + New PIC
            </button>
          )}
        </div>
      </div>

      <div className="panel px-3 py-2 mb-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
          <span className="text-ink-500 text-sm">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search # or name…"
            className="bg-transparent outline-none text-sm flex-1 text-ink-100 placeholder:text-ink-600 min-w-0"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-ink-500 hover:text-ink-200 text-xs px-1"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <FilterChip
          active={filterAcuity}
          onClick={() => setFilterAcuity((v) => !v)}
          title="Current code 1 or 2"
        >
          High acuity
        </FilterChip>
        <FilterChip
          active={filterOverdue}
          onClick={() => setFilterOverdue((v) => !v)}
          title="Code 3 checks past due"
        >
          Overdue
        </FilterChip>
        <FilterChip
          active={filterIncomplete}
          onClick={toggleFilter}
          title={incompleteCount > 0 ? `${incompleteCount} incomplete record${incompleteCount === 1 ? '' : 's'}` : 'No incomplete records'}
        >
          Incomplete{incompleteCount > 0 ? ` (${incompleteCount})` : ''}
        </FilterChip>
        <FilterChip
          active={filterUnassigned}
          onClick={() => setFilterUnassigned((v) => !v)}
          title="No KPE assigned"
        >
          Unassigned
        </FilterChip>
        <select
          value={filterKpe}
          onChange={(e) => setFilterKpe(e.target.value)}
          className={`text-[11px] font-display font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-md bg-transparent border transition ${
            filterKpe ? 'border-ink-100 text-ink-100' : 'border-ink-800 text-ink-400 hover:text-ink-100'
          }`}
        >
          <option value="">KPE: all</option>
          {kpeOptions.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        {anyFilterActive && (
          <span className="text-[10px] text-ink-500 font-display tabular-nums ml-auto whitespace-nowrap">
            {inCare.length + discharged.length} match{inCare.length + discharged.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      {view === 'table' ? (
        <TableBoard pics={[...inCare, ...discharged]} events={events} eventCfg={eventCfg} onPicClick={onPicClick} onEdited={reload} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5" data-tick={tick}>
        <section className="space-y-3">
          <header className="flex items-center gap-3 px-1">
            <span className="w-2 h-2 rounded-full bg-code-5 animate-pulse" />
            <h3 className="font-display font-bold uppercase tracking-[0.18em] text-sm text-ink-300">
              In care
            </h3>
            <span className="text-xs text-ink-500 font-display tabular-nums">
              {anyFilterActive ? `${inCare.length} / ${inCareAll.length}` : inCareAll.length}
            </span>
            <button
              onClick={toggleSort}
              className="ml-auto text-[10px] font-display uppercase tracking-widest text-ink-400 hover:text-ink-100 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-ink-800 transition"
              title={sortDir === 'desc' ? 'Newest first — click to flip' : 'Oldest first — click to flip'}
            >
              <span>#</span>
              <span className="text-sm leading-none">{sortDir === 'desc' ? '↓' : '↑'}</span>
            </button>
          </header>

          {inCare.length === 0 ? (
            <div className="panel p-10 text-center">
              {anyFilterActive && inCareAll.length > 0 ? (
                <>
                  <p className="text-ink-500 font-display tracking-wide">
                    No in-care PICs match the current search/filters.
                  </p>
                  <button
                    onClick={() => {
                      setSearch('')
                      setFilterAcuity(false)
                      setFilterOverdue(false)
                      setFilterUnassigned(false)
                      setFilterKpe('')
                      if (filterIncomplete) toggleFilter()
                    }}
                    className="btn-ghost mt-4"
                  >
                    Clear search &amp; filters — show all {inCareAll.length}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-ink-500 font-display tracking-wide">No PICs currently in care.</p>
                  {onAddPic && (
                    <button onClick={onAddPic} className="btn-ghost mt-4">
                      + Admit first PIC
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {inCare.map((pic) => (
                <PicCard
                  key={pic.id}
                  pic={pic}
                  events={events}
                  eventCfg={eventCfg}
                  allPics={pics}
                  onClick={() => onPicClick?.(pic)}
                  onMarkChecked={onMarkChecked}
                  onTapKpe={() => onPicTapKpe?.(pic)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <header className="flex items-center gap-3 px-1">
            <span className="w-2 h-2 rounded-full bg-ink-600" />
            <h3 className="font-display font-bold uppercase tracking-[0.18em] text-sm text-ink-400">
              Discharged
            </h3>
            <span className="text-xs text-ink-500 font-display tabular-nums">
              {discharged.length}
            </span>
          </header>

          {discharged.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="text-ink-500 text-sm">No discharges yet.</p>
            </div>
          ) : (
            <div className="panel divide-y divide-ink-800 overflow-hidden">
              {discharged.map((pic) => (
                <DischargedRow
                  key={pic.id}
                  pic={pic}
                  eventCfg={eventCfg}
                  allPics={pics}
                  onClick={() => onPicClick?.(pic)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  )
}

// --- DischargedRow: compact single-line summary; click to open detail panel ---

function abbrevGender(g) {
  if (!g) return ''
  if (g === 'Feminine') return 'F'
  if (g === 'Masculine') return 'M'
  if (g === 'Non-binary') return 'NB'
  return g
}

function DischargedRow({ pic, eventCfg, allPics, onClick }) {
  const assignedKpe = getAssignedKpe(pic)
  const shift = shiftFor(assignedKpe, eventCfg)
  const shiftClass = shift === 1 ? 'bg-shift-1' : shift === 2 ? 'bg-shift-2' : 'bg-ink-700'
  const workload = workloadFor(assignedKpe, allPics)

  const duration = elapsedMinutes(pic.enteredCare, pic.leftCare)
  const picNum = pic.number ?? Number(pic.id?.replace('pic_', ''))

  // Identifier: prefer name; fall back to description; otherwise placeholder
  const hasName = !!(pic.name && pic.name.trim())
  const hasDescription = !!(pic.description && pic.description.trim())
  const identifier = hasName ? pic.name : hasDescription ? pic.description : '— no name —'
  const identifierEmpty = !hasName && !hasDescription

  // Demo string: F 18-19
  const demogParts = []
  if (pic.gender) demogParts.push(abbrevGender(pic.gender))
  if (pic.ageRange) demogParts.push(pic.ageRange)
  const demog = demogParts.join(' ')

  const outcomeDisplay =
    pic.outcome === 'Other' ? pic.outcomeOther || 'Other' : pic.outcome

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3.5 py-2 flex items-center gap-3 text-sm hover:bg-ink-800/40 transition"
    >
      {/* Left: PIC# + identifier + demo */}
      <div className="flex items-baseline gap-2 flex-1 min-w-0">
        <span className="font-display font-bold tabular-nums text-ink-200 shrink-0">
          #{picNum}
        </span>
        <span
          className={`font-display font-semibold truncate ${
            identifierEmpty ? 'text-ink-500 italic font-medium' : 'text-ink-200'
          } ${!hasName && hasDescription ? 'italic font-medium' : ''}`}
        >
          {identifier}
        </span>
        {demog && (
          <span className="text-xs text-ink-500 shrink-0">· {demog}</span>
        )}
      </div>

      {/* Middle: medical + security icons (KPE hidden on discharged rows) */}
      <div className="flex items-center gap-2 shrink-0">
        {pic.medicalInvolved === true && (
          <span
            className="text-code-1 text-base leading-none"
            title="Medical involved"
          >
            ⚕
          </span>
        )}
        {pic.ejectionFlag && (
          <span
            className={`leading-none ${
              pic.securityNotified === true
                ? 'text-code-5'
                : pic.securityNotified === false
                ? 'text-code-1'
                : 'text-ink-300'
            }`}
            title={
              pic.securityNotified === true
                ? 'Security Flag — Security notified at discharge'
                : pic.securityNotified === false
                ? 'Security Flag — Security NOT notified at discharge'
                : 'Security Flag — notification status not recorded'
            }
          >
            <ShieldIcon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Right: outcome + duration */}
      <div className="flex items-center gap-2 shrink-0">
        {outcomeDisplay ? (
          <span className="tag">{outcomeDisplay}</span>
        ) : (
          <span className="text-xs text-ink-600 italic">no outcome</span>
        )}
        <span className="font-display tabular-nums text-ink-400 text-xs whitespace-nowrap">
          {formatElapsed(duration)}
        </span>
      </div>
    </button>
  )
}
