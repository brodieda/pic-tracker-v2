import { useEffect, useMemo, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import {
  addCheckEvent,
  getAssignedKpe,
  currentCodeFor,
  code3MonitorStateFor,
  minutesSinceLastActivity,
  elapsedMinutes,
  formatElapsed,
  shiftFor,
  wasEverCode2,
} from '../lib/helpers'
import { CODES } from '../constants/options'
import ShieldIcon from './ShieldIcon'

// Priority for the walk-around order: most urgent at the top.
function priorityOf(code, monitor) {
  if (code === 1) return 0
  if (code === 2) return 1
  if (monitor === 'overdue') return 2
  if (monitor === 'due_soon') return 3
  return 4
}

function CodeSquare({ code }) {
  const cfg = CODES.find((c) => c.code === code)
  if (!cfg) {
    return (
      <span className="w-11 h-11 rounded-xl bg-ink-800 border border-ink-700 text-ink-500 font-display font-bold flex items-center justify-center shrink-0">
        —
      </span>
    )
  }
  const tone = code === 3 ? 'text-ink-950' : 'text-white'
  return (
    <span
      className={`w-11 h-11 rounded-xl ${cfg.tw} ${tone} font-display font-bold text-xl flex items-center justify-center shrink-0`}
    >
      {code}
    </span>
  )
}

export default function FloorCheck({ refreshKey, onPicClick }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [tick, setTick] = useState(0)

  const reload = () => {
    setPics(getPics())
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    reload()
  }, [refreshKey])

  // Re-evaluate timers every 20s.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 20_000)
    return () => clearInterval(id)
  }, [])

  const rows = useMemo(() => {
    const now = Date.now()
    return (pics || [])
      .filter((p) => p.status === 'in_care')
      .map((p) => {
        const code = currentCodeFor(p.id, events)
        const monitor = code3MonitorStateFor(p.id, events, eventCfg, now)
        const sinceCheck = minutesSinceLastActivity(p.id, events, now)
        const inCareMins = elapsedMinutes(p.enteredCare, null)
        const kpe = getAssignedKpe(p)
        const shift = shiftFor(kpe, eventCfg)
        return {
          pic: p,
          code,
          monitor,
          sinceCheck,
          inCareMins,
          kpe,
          shiftClass: shift === 1 ? 'bg-shift-1' : shift === 2 ? 'bg-shift-2' : 'bg-ink-700',
          mh: wasEverCode2(p.id, events),
          prio: priorityOf(code, monitor),
        }
      })
      .sort((a, b) => a.prio - b.prio || (b.sinceCheck ?? 0) - (a.sinceCheck ?? 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pics, events, eventCfg, tick])

  const markChecked = (pic) => {
    addCheckEvent(pic.id, getAssignedKpe(pic), null)
    reload()
  }

  const overdueCount = rows.filter((r) => r.monitor === 'overdue').length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
        <h2 className="font-display font-bold text-xl">Floor check</h2>
        <span className="text-sm text-ink-500">
          {rows.length} in care{overdueCount > 0 && ` · ${overdueCount} overdue`} · most urgent first
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center text-ink-500">No one is currently in care.</div>
      ) : (
        <div className="panel divide-y divide-ink-800 overflow-hidden">
          {rows.map(({ pic, code, monitor, sinceCheck, inCareMins, kpe, shiftClass, mh }) => {
            const sinceLabel =
              sinceCheck == null ? '—' : sinceCheck === 0 ? 'just now' : `${formatElapsed(sinceCheck)} ago`
            let stateLabel = ''
            let sinceTone = 'text-ink-400'
            if (monitor === 'overdue') {
              stateLabel = 'check overdue'
              sinceTone = 'text-code-1 font-bold'
            } else if (monitor === 'due_soon') {
              stateLabel = 'check due soon'
              sinceTone = 'text-code-3 font-bold'
            } else if (monitor === 'ok') {
              stateLabel = 'checked'
              sinceTone = 'text-code-5'
            } else if (code === 1) {
              stateLabel = 'emergency'
              sinceTone = 'text-code-1 font-bold'
            } else if (code === 2) {
              stateLabel = 'mental health'
              sinceTone = 'text-code-2 font-bold'
            } else {
              stateLabel = 'last seen'
            }

            return (
              <div
                key={pic.id}
                onClick={() => onPicClick?.(pic.id)}
                className={`flex items-center gap-3 sm:gap-4 px-4 py-3 cursor-pointer transition hover:bg-ink-800/40 ${
                  monitor === 'overdue' || code === 1 || code === 2 ? 'bg-code-1/5' : ''
                }`}
              >
                <CodeSquare code={code} />

                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-ink-100 truncate">
                    <span className="tabular-nums text-ink-300">#{pic.number}</span>{' '}
                    {pic.name?.trim() || pic.description?.trim() || (
                      <span className="text-ink-500 italic font-medium">no name</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-ink-500 flex-wrap">
                    <span>In {formatElapsed(inCareMins)}</span>
                    {kpe ? (
                      <span className={`inline-flex items-center ${shiftClass} text-white rounded-full px-2 py-0.5 font-semibold`}>
                        {kpe}
                      </span>
                    ) : (
                      <span className="italic text-ink-600">no KPE</span>
                    )}
                    {mh && (
                      <span className="inline-flex items-center gap-1 bg-code-2/15 border border-code-2/50 text-code-2 rounded px-1.5 font-bold uppercase tracking-widest">
                        ⚑ MH
                      </span>
                    )}
                    {pic.ejectionFlag && (
                      <span className="inline-flex items-center secflag-on rounded px-1.5 py-0.5 gap-1 text-[10px] font-bold uppercase tracking-widest">
                        <ShieldIcon className="w-3 h-3" /> SEC
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-sm tabular-nums ${sinceTone}`}>{sinceLabel}</div>
                  <div className="text-[10px] uppercase tracking-widest text-ink-500 hidden sm:block">{stateLabel}</div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    markChecked(pic)
                  }}
                  className={`shrink-0 rounded-xl px-4 py-3 text-sm font-display font-bold transition ${
                    monitor === 'overdue'
                      ? 'bg-code-1 text-white hover:opacity-90'
                      : monitor === 'due_soon'
                      ? 'bg-code-3 text-ink-950 hover:opacity-90'
                      : 'bg-ink-800 border border-ink-700 text-ink-200 hover:border-ink-500'
                  }`}
                >
                  Mark checked
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
