import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPics, getEvents, getEvent } from '../lib/store'
import {
  currentCodeFor,
  code3MonitorStateFor,
  getAssignedKpe,
  elapsedMinutes,
  formatElapsed,
} from '../lib/helpers'
import { isIncomplete } from '../lib/completeness'

const CODE_COLOR = {
  1: 'bg-code-1',
  2: 'bg-code-2',
  3: 'bg-code-3',
  4: 'bg-code-4',
  5: 'bg-code-5',
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-display font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full transition whitespace-nowrap ${
        active ? 'bg-violet-500 text-white' : 'bg-ink-800 text-ink-400 hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  )
}

// GlobalSearch — nav-bar icon that opens a quick-jump search+filter overlay.
// Full-screen on mobile, a centred palette on desktop. Reads a fresh snapshot
// of local storage each time it opens (same pattern CareBoard uses), so it
// works from any page without needing pics/events threaded down from App.
export default function GlobalSearch({ onOpenPic }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filterAcuity, setFilterAcuity] = useState(false)
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [filterIncomplete, setFilterIncomplete] = useState(false)
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const [snapshot, setSnapshot] = useState({ pics: [], events: [], eventCfg: {} })
  const inputRef = useRef(null)

  const openPalette = () => {
    setSnapshot({ pics: getPics(), events: getEvents(), eventCfg: getEvent() })
    setQuery('')
    setFilterAcuity(false)
    setFilterOverdue(false)
    setFilterIncomplete(false)
    setFilterUnassigned(false)
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  useEffect(() => {
    const onKey = (e) => {
      if (open) {
        if (e.key === 'Escape') setOpen(false)
        return
      }
      if (e.key === '/') {
        const tag = document.activeElement?.tagName
        const editable = document.activeElement?.isContentEditable
        if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) {
    return (
      <button
        onClick={openPalette}
        title="Search (/)"
        aria-label="Search"
        className="icon-btn w-9 h-9"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    )
  }

  const { pics, events, eventCfg } = snapshot
  const q = query.trim().toLowerCase().replace(/^#/, '')

  const results = pics
    .filter((p) => {
      if (q) {
        const num = String(p.number ?? '')
        const name = (p.name || '').toLowerCase()
        const desc = (p.description || '').toLowerCase()
        if (!(num.includes(q) || name.includes(q) || desc.includes(q))) return false
      }
      if (filterAcuity) {
        const code = currentCodeFor(p.id, events)
        if (!(code === 1 || code === 2)) return false
      }
      if (filterOverdue && code3MonitorStateFor(p.id, events, eventCfg) !== 'overdue') return false
      if (filterIncomplete && !isIncomplete(p)) return false
      if (filterUnassigned && getAssignedKpe(p)) return false
      return true
    })
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0))
    .slice(0, 40)

  const pick = (pic) => {
    setOpen(false)
    onOpenPic?.(pic.id)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex sm:items-start sm:justify-center bg-ink-950/70 sm:pt-24">
      <div className="hidden sm:block absolute inset-0" onClick={() => setOpen(false)} />
      <div
        className="dropdown-panel relative w-full h-full sm:h-auto sm:max-h-[70vh] sm:w-[560px] bg-ink-900 sm:rounded-xl sm:border sm:border-ink-700 shadow-2xl flex flex-col overflow-hidden"
        style={{ '--panel-origin': 'top' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-800 shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-ink-500 shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search # or name…"
            className="flex-1 bg-transparent outline-none text-base text-ink-100 placeholder:text-ink-600"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-xs font-display font-semibold text-ink-500 hover:text-ink-200 px-2 py-1 shrink-0"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ink-800 flex-wrap shrink-0">
          <FilterPill active={filterAcuity} onClick={() => setFilterAcuity((v) => !v)}>
            High acuity
          </FilterPill>
          <FilterPill active={filterOverdue} onClick={() => setFilterOverdue((v) => !v)}>
            Overdue
          </FilterPill>
          <FilterPill active={filterIncomplete} onClick={() => setFilterIncomplete((v) => !v)}>
            Incomplete
          </FilterPill>
          <FilterPill active={filterUnassigned} onClick={() => setFilterUnassigned((v) => !v)}>
            Unassigned
          </FilterPill>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="text-[10px] font-display font-bold uppercase tracking-widest text-ink-500 px-4 pt-3 pb-1">
            {results.length} match{results.length === 1 ? '' : 'es'}
          </div>
          {results.length === 0 && (
            <p className="text-sm text-ink-500 italic px-4 py-6 text-center">No matching PICs.</p>
          )}
          {results.map((pic) => {
            const isDischarged = pic.status === 'discharged'
            const code = currentCodeFor(pic.id, events)
            const assignedKpe = getAssignedKpe(pic)
            const elapsed = elapsedMinutes(pic.enteredCare, pic.leftCare)
            return (
              <button
                key={pic.id}
                onClick={() => pick(pic)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800/60 transition text-left"
              >
                <span
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-display font-black text-white shrink-0 ${
                    isDischarged ? 'bg-ink-600' : CODE_COLOR[code] || 'bg-ink-600'
                  }`}
                >
                  {isDischarged ? '—' : code ?? '?'}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-display font-semibold text-ink-100 truncate">
                    #{pic.number} {pic.name || <span className="italic text-ink-500">no name</span>}
                  </span>
                  <span className="block text-xs text-ink-500 truncate">
                    {isDischarged
                      ? `Discharged · ${formatElapsed(elapsed)} in care`
                      : `${assignedKpe || 'Unassigned'} · ${formatElapsed(elapsed)} in care`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
