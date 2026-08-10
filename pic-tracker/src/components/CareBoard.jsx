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
  friendsInsideCount,
} from '../lib/helpers'

const CAPACITY_WARNING_THRESHOLD = 3
const SORT_KEY = 'pic_in_care_sort_dir'

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

  const onMarkChecked = (pic) => {
    addCheckEvent(pic.id, getAssignedKpe(pic), null)
    reload()
  }

  // Sort in-care purely by PIC number — no code-priority sort. Visual indicators handle priority.
  const inCare = pics
    .filter((p) => p.status === 'in_care')
    .slice()
    .sort((a, b) => {
      const an = a.number ?? 0
      const bn = b.number ?? 0
      return sortDir === 'desc' ? bn - an : an - bn
    })

  const discharged = pics
    .filter((p) => p.status === 'discharged')
    .sort((a, b) => new Date(b.leftCare || 0) - new Date(a.leftCare || 0))

  const capacity = eventCfg.capacity
  const inCareCount = inCare.length
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
  const ringColorClass = atCapacity ? 'text-code-1' : nearCapacity ? 'text-code-3' : 'text-code-5'
  const ringR = 15.5
  const ringC = 2 * Math.PI * ringR
  const occupiedPct = capacity > 0 ? Math.min(100, (occupied / capacity) * 100) : 0
  const ringOffset = ringC * (1 - occupiedPct / 100)

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
    <div className="px-4 sm:px-6 pt-6 pb-24 sm:pb-6 max-w-7xl mx-auto">
      {/* Title + controls merged into one header block sharing a bottom border,
          now that search has moved into the nav bar and there's less competing
          for room in this strip. */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-5 mb-6 border-b border-ink-800">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ care board</p>
          <h2 className="text-3xl font-display font-bold">
            {eventCfg.name || 'Untitled event'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Desktop: compact ring + numbers + friends icon toggle, all in one chip */}
          {capacity != null && (
            <div className="hidden sm:flex items-center gap-2.5 bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 shrink-0">
              <svg viewBox="0 0 36 36" className={`w-7 h-7 shrink-0 ${ringColorClass}`}>
                <circle cx="18" cy="18" r={ringR} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r={ringR}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  className="transition-all"
                />
              </svg>
              <div className="leading-tight">
                <div className={`text-sm font-display font-bold tabular-nums ${capacityTextTone}`}>
                  {occupied}
                  <span className="opacity-50 font-medium"> / {capacity}</span>
                </div>
                <div className="text-[9px] uppercase tracking-wide text-ink-500 font-bold whitespace-nowrap">
                  {atCapacity ? 'full' : `${spacesRemaining} free`}
                </div>
              </div>
              {canEditSettings && (
                <button
                  onClick={onToggleCountFriends}
                  title={
                    countFriends
                      ? `Counting friends toward capacity — ${inCareCount} PICs · ${friendsCount} friends`
                      : 'Count friends toward capacity'
                  }
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition shrink-0 ${
                    countFriends ? 'bg-violet-500/20 text-violet-400' : 'text-ink-600 hover:text-ink-300 hover:bg-ink-800'
                  }`}
                >
                  👥
                </button>
              )}
            </div>
          )}

          {/* Mobile: slim bar instead of the ring — more width available for it, less for a chip */}
          {capacity != null && (
            <div className="flex sm:hidden flex-col gap-1 flex-1 min-w-[140px]">
              <div className="flex items-baseline justify-between">
                <span className={`font-display font-bold text-sm tabular-nums ${capacityTextTone}`}>
                  {occupied}
                  <span className="opacity-50 font-medium"> / {capacity}</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-ink-500">
                  {atCapacity ? 'full' : `${spacesRemaining} free`}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-ink-800 overflow-hidden">
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
            </div>
          )}

          {/* New PIC — inline on desktop; mobile gets a floating action button instead (see below) */}
          {onAddPic && (
            <button onClick={onAddPic} className="hidden sm:inline-flex btn-primary text-base px-5 py-3 shrink-0">
              + New PIC
            </button>
          )}
        </div>
      </div>

      {/* Mobile floating action button — always reachable regardless of scroll position */}
      {onAddPic && (
        <button
          onClick={onAddPic}
          className="sm:hidden fixed bottom-5 right-5 z-30 btn-primary rounded-2xl px-5 py-3.5 text-sm shadow-2xl flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> New PIC
        </button>
      )}

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
            <span className="text-xs text-ink-500 font-display tabular-nums">{inCare.length}</span>
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
              <p className="text-ink-500 font-display tracking-wide">No PICs currently in care.</p>
              {onAddPic && (
                <button onClick={onAddPic} className="btn-ghost mt-4">
                  + Admit first PIC
                </button>
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

  const accentClass = pic.ejectionFlag
    ? 'border-l-4 border-l-code-1'
    : pic.medicalInvolved === true
    ? 'border-l-4 border-l-violet-500'
    : 'border-l-4 border-l-transparent'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3.5 py-2 flex items-center gap-3 text-sm hover:bg-ink-800/40 transition ${accentClass}`}
    >
      {/* Left: PIC# + identifier + demo + medical/security icons */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
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
        {(pic.medicalInvolved === true || pic.ejectionFlag) && (
          <span className="flex items-center gap-1.5 shrink-0">
            {pic.medicalInvolved === true && (
              <span
                className="inline-flex items-center gap-1 text-violet-500 text-[10px] font-display font-bold uppercase tracking-wide leading-none"
                title="Medical involved"
              >
                <span className="text-sm">⚕</span>
                Medical
              </span>
            )}
            {pic.ejectionFlag && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wide leading-none ${
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
                Security
              </span>
            )}
          </span>
        )}
      </div>

      <span className="font-display tabular-nums text-ink-400 text-xs whitespace-nowrap shrink-0 w-14 text-right">
        {formatElapsed(duration)}
      </span>
    </button>
  )
}
