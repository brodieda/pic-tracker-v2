import { useEffect, useRef, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import { code3MonitorStateFor, minutesSinceLastActivity, getAssignedKpe, addCheckEvent, formatElapsed } from '../lib/helpers'
import { getActivityLastSeen, setActivityLastSeenNow } from '../lib/activityRead'

const PAGE_SIZE = 30

const TYPE_LABEL = {
  admit: 'admitted',
  code_change: 'code changed',
  kpe_change: 'KPE changed',
  note: 'note added',
  check: 'checked',
  discharge: 'discharged',
  flag_change: 'flag changed',
  friend_added: 'friend added',
  friend_removed: 'friend removed',
  friend_inside_change: 'friend status changed',
  friend_converted: 'friend converted to PIC',
}
const TYPE_DOT = {
  admit: 'bg-code-4',
  discharge: 'bg-ink-500',
  check: 'bg-code-5',
  code_change: 'bg-code-3',
  kpe_change: 'bg-shift-2',
  flag_change: 'bg-code-1',
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function ActivityBell({ refreshKey, onOpenPic }) {
  const [open, setOpen] = useState(false)
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [lastSeen, setLastSeen] = useState(getActivityLastSeen())
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [now, setNow] = useState(Date.now())
  const ref = useRef(null)

  const load = () => {
    setPics(getPics())
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    load()
  }, [refreshKey])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const picById = Object.fromEntries(pics.map((p) => [p.id, p]))

  const overdueList = pics
    .filter((p) => p.status === 'in_care' && code3MonitorStateFor(p.id, events, eventCfg, now) === 'overdue')
    .map((p) => {
      const sinceLast = minutesSinceLastActivity(p.id, events, now)
      const interval = eventCfg.code3CheckIntervalMinutes || 15
      const overdueBy = sinceLast != null ? Math.max(0, sinceLast - interval) : null
      return { pic: p, overdueBy }
    })
    .sort((a, b) => (b.overdueBy ?? 0) - (a.overdueBy ?? 0))

  const feedAll = events
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const unseenCount = feedAll.filter((e) => new Date(e.timestamp).getTime() > lastSeen).length
  const badgeCount = overdueList.length + unseenCount

  const openPanel = () => {
    setOpen(true)
    setVisibleCount(PAGE_SIZE)
    setActivityLastSeenNow()
    setLastSeen(Date.now())
  }

  const onMarkChecked = (pic) => {
    addCheckEvent(pic.id, getAssignedKpe(pic), null)
    load()
  }

  const jump = (picId) => {
    setOpen(false)
    onOpenPic?.(picId)
  }

  const feedVisible = feedAll.slice(0, visibleCount)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        title="Activity"
        aria-label="Activity"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md bg-ink-800 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 transition"
      >
        <BellIcon />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-code-1 text-white text-[9px] font-display font-bold flex items-center justify-center">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="w-full h-full sm:h-auto sm:max-h-[32rem] bg-ink-900 sm:rounded-2xl shadow-2xl sm:ring-1 sm:ring-ink-700 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-800 shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(false)} className="sm:hidden text-ink-400 text-lg leading-none px-1">
                  ←
                </button>
                <h3 className="font-display font-bold text-sm text-ink-100">Activity</h3>
              </div>
              <button onClick={() => setOpen(false)} className="hidden sm:inline text-ink-500 hover:text-ink-200 text-sm px-1">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {overdueList.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] font-display font-bold uppercase tracking-widest text-code-1">
                    Needs attention · {overdueList.length}
                  </div>
                  {overdueList.map(({ pic, overdueBy }) => (
                    <div key={pic.id} className="flex items-center gap-3 px-4 py-2 border-b border-ink-800">
                      <span className="w-2 h-2 rounded-full bg-code-1 shrink-0" />
                      <button onClick={() => jump(pic.id)} className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-display font-semibold text-ink-100 truncate">
                          #{pic.number} {pic.name || 'unnamed'} — check overdue
                        </div>
                        <div className="text-[11px] text-ink-500">
                          {overdueBy != null ? `by ${overdueBy}m` : ''} · code 3
                        </div>
                      </button>
                      <button
                        onClick={() => onMarkChecked(pic)}
                        className="bg-code-1 text-white rounded-md px-2.5 py-1.5 text-[11px] font-display font-bold shrink-0 hover:opacity-90"
                      >
                        Mark checked
                      </button>
                    </div>
                  ))}
                </>
              )}

              <div className="px-4 pt-3 pb-1.5 text-[10px] font-display font-bold uppercase tracking-widest text-ink-500">
                Recent activity
              </div>
              {feedVisible.length === 0 && (
                <p className="text-sm text-ink-500 italic px-4 py-6 text-center">Nothing logged yet.</p>
              )}
              {feedVisible.map((e) => {
                const pic = picById[e.picId]
                const minsAgo = Math.max(0, Math.floor((now - new Date(e.timestamp).getTime()) / 60_000))
                return (
                  <button
                    key={e.id}
                    onClick={() => pic && jump(pic.id)}
                    className="w-full flex items-center gap-3 px-4 py-2 border-b border-ink-800 hover:bg-ink-800/50 transition text-left"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[e.type] || 'bg-ink-600'}`} />
                    <span className="flex-1 min-w-0 text-[12.5px] text-ink-200 truncate">
                      <span className="font-display font-semibold">
                        {pic ? `#${pic.number} ${pic.name || ''}`.trim() : 'PIC'}
                      </span>{' '}
                      {TYPE_LABEL[e.type] || e.type}
                      {e.actorName && <span className="text-ink-500"> · {e.actorName}</span>}
                    </span>
                    <span className="text-[10.5px] text-ink-500 shrink-0">{formatElapsed(minsAgo)}</span>
                  </button>
                )
              })}
              {feedAll.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  className="w-full text-center text-[11.5px] font-display font-semibold text-ink-400 hover:text-ink-100 py-3"
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
