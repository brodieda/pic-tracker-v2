import { useEffect, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import PicCard from './PicCard'
import {
  addCheckEvent,
  getAssignedKpe,
  elapsedMinutes,
  formatElapsed,
  shiftFor,
  workloadFor,
} from '../lib/helpers'
import { isIncomplete } from '../lib/completeness'

const CAPACITY_WARNING_THRESHOLD = 3
const SORT_KEY = 'pic_in_care_sort_dir'
const FILTER_KEY = 'pic_in_care_filter_incomplete'

export default function CareBoard({ refreshKey, onAddPic, onPicClick, onPicTapKpe }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [tick, setTick] = useState(0)
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
  const inCare = filterIncomplete ? inCareAll.filter(isIncomplete) : inCareAll

  const discharged = pics
    .filter((p) => p.status === 'discharged')
    .sort((a, b) => new Date(b.leftCare || 0) - new Date(a.leftCare || 0))

  const capacity = eventCfg.capacity
  const inCareCount = inCareAll.length
  const spacesRemaining = capacity != null ? Math.max(0, capacity - inCareCount) : null
  const atCapacity = capacity != null && inCareCount >= capacity
  const nearCapacity =
    capacity != null && !atCapacity && spacesRemaining <= CAPACITY_WARNING_THRESHOLD

  let capacityTone = 'border-ink-700 text-ink-300 bg-ink-900'
  if (atCapacity) capacityTone = 'border-code-1 text-code-1 bg-code-1/10'
  else if (nearCapacity) capacityTone = 'border-code-3 text-code-3 bg-code-3/10'

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ care board</p>
          <h2 className="text-3xl font-display font-bold">
            {eventCfg.name || 'Untitled event'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {capacity != null && (
            <div
              className={`px-3 py-2 rounded-lg border font-display tabular-nums text-sm font-semibold ${capacityTone}`}
            >
              <span className="text-lg">{inCareCount}</span>
              <span className="opacity-60"> / {capacity}</span>
              <span className="ml-2 text-[10px] uppercase tracking-widest opacity-70">
                {atCapacity ? 'full' : `${spacesRemaining} ${spacesRemaining === 1 ? 'space' : 'spaces'} free`}
              </span>
            </div>
          )}
          <button onClick={onAddPic} className="btn-primary text-base px-5 py-3">
            + New PIC
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5" data-tick={tick}>
        <section className="space-y-3">
          <header className="flex items-center gap-3 px-1">
            <span className="w-2 h-2 rounded-full bg-code-5 animate-pulse" />
            <h3 className="font-display font-bold uppercase tracking-[0.18em] text-sm text-ink-300">
              In care
            </h3>
            <span className="text-xs text-ink-500 font-display tabular-nums">
              {filterIncomplete ? `${inCare.length} / ${inCareAll.length}` : inCareAll.length}
            </span>
            <button
              onClick={toggleFilter}
              disabled={incompleteCount === 0 && !filterIncomplete}
              className={`ml-auto text-[10px] font-display uppercase tracking-widest inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition ${
                filterIncomplete
                  ? 'bg-code-3 text-ink-950 hover:opacity-90'
                  : incompleteCount > 0
                    ? 'text-code-3 hover:bg-ink-800'
                    : 'text-ink-600 cursor-not-allowed'
              }`}
              title={
                filterIncomplete
                  ? 'Showing only incomplete — click to show all'
                  : incompleteCount > 0
                    ? `Show only ${incompleteCount} incomplete record${incompleteCount === 1 ? '' : 's'}`
                    : 'No incomplete records'
              }
            >
              <span>!</span>
              <span>incomplete</span>
              {incompleteCount > 0 && <span className="font-bold">{incompleteCount}</span>}
            </button>
            <button
              onClick={toggleSort}
              className="text-[10px] font-display uppercase tracking-widest text-ink-400 hover:text-ink-100 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-ink-800 transition"
              title={sortDir === 'desc' ? 'Newest first — click to flip' : 'Oldest first — click to flip'}
            >
              <span>#</span>
              <span className="text-sm leading-none">{sortDir === 'desc' ? '↓' : '↑'}</span>
            </button>
          </header>

          {inCare.length === 0 ? (
            <div className="panel p-10 text-center">
              {filterIncomplete && inCareAll.length > 0 ? (
                <>
                  <p className="text-ink-500 font-display tracking-wide">
                    All in-care records are complete.
                  </p>
                  <button onClick={toggleFilter} className="btn-ghost mt-4">
                    Show all {inCareAll.length}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-ink-500 font-display tracking-wide">No PICs currently in care.</p>
                  <button onClick={onAddPic} className="btn-ghost mt-4">
                    + Admit first PIC
                  </button>
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

      {/* Middle: KPE + medical icon */}
      <div className="flex items-center gap-2 shrink-0">
        {assignedKpe && (
          <span
            className={`inline-flex items-center gap-1.5 ${shiftClass} text-white text-[11px] font-semibold px-2 py-0.5 rounded-full`}
          >
            {assignedKpe}
            {workload > 0 && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(workload, 3) }).map((_, i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-white/85" />
                ))}
                {workload > 3 && <span className="text-[10px] font-bold leading-none ml-0.5">+</span>}
              </span>
            )}
          </span>
        )}
        {pic.medicalInvolved === true && (
          <span
            className="text-code-1 text-base leading-none"
            title="Medical involved"
          >
            ⚕
          </span>
        )}
      </div>

      {/* Right: outcome + duration */}
      <div className="flex items-center gap-3 shrink-0">
        {outcomeDisplay ? (
          <span className="tag">{outcomeDisplay}</span>
        ) : (
          <span className="text-xs text-ink-600 italic">no outcome</span>
        )}
        <span className="font-display tabular-nums text-ink-400 text-xs w-16 text-right">
          {formatElapsed(duration)}
        </span>
      </div>
    </button>
  )
}
