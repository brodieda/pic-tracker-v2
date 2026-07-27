import { useEffect, useMemo, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import {
  addCheckEvent,
  getAssignedKpe,
  currentCodeFor,
  code3MonitorStateFor,
  minutesSinceLastActivity,
  formatElapsed,
  shiftFor,
  wasEverCode2,
} from '../lib/helpers'
import { CODES } from '../constants/options'
import ShieldIcon from './ShieldIcon'

// Urgency tier: lower = more urgent. Drives which group a PIC lands in.
function tierOf(code, monitor) {
  if (code === 1 || code === 2 || monitor === 'overdue') return 0 // needs attention
  if (monitor === 'due_soon') return 1 // due soon
  return 2 // ok / monitoring
}

const GROUPS = [
  { tier: 0, label: 'Needs attention', tone: 'text-code-1', prefix: '⚠ ' },
  { tier: 1, label: 'Due soon', tone: 'text-code-3', prefix: '' },
  { tier: 2, label: 'OK', tone: 'text-ink-500', prefix: '' },
]

function CodeSquare({ code }) {
  const cfg = CODES.find((c) => c.code === code)
  if (!cfg) {
    return (
      <span className="w-9 h-9 rounded-lg bg-ink-800 border border-ink-700 text-ink-500 font-display font-bold flex items-center justify-center shrink-0">
        —
      </span>
    )
  }
  const tone = code === 3 ? 'text-ink-950' : 'text-white'
  return (
    <span
      className={`w-9 h-9 rounded-lg ${cfg.tw} ${tone} font-display font-bold text-lg flex items-center justify-center shrink-0`}
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
        const kpe = getAssignedKpe(p)
        const shift = shiftFor(kpe, eventCfg)
        return {
          pic: p,
          code,
          monitor,
          sinceCheck,
          kpe,
          shiftClass: shift === 1 ? 'bg-shift-1' : shift === 2 ? 'bg-shift-2' : 'bg-ink-600',
          mh: wasEverCode2(p.id, events),
          tier: tierOf(code, monitor),
        }
      })
      .sort((a, b) => a.tier - b.tier || (b.sinceCheck ?? 0) - (a.sinceCheck ?? 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pics, events, eventCfg, tick])

  const markChecked = (pic) => {
    addCheckEvent(pic.id, getAssignedKpe(pic), null)
    reload()
  }

  const grouped = GROUPS.map((g) => ({ ...g, items: rows.filter((r) => r.tier === g.tier) })).filter(
    (g) => g.items.length > 0
  )

  const sinceToneFor = (tier) =>
    tier === 0 ? 'text-code-1 font-bold' : tier === 1 ? 'text-code-3 font-bold' : 'text-ink-400'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
        <h2 className="font-display font-bold text-xl">Floor check</h2>
        <span className="text-sm text-ink-500">{rows.length} in care</span>
      </div>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center text-ink-500">No one is currently in care.</div>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <section key={g.tier}>
              <div className={`text-[11px] font-display font-bold tracking-[0.16em] uppercase mb-1.5 ${g.tone}`}>
                {g.prefix}
                {g.label} · {g.items.length}
              </div>
              <div className="panel divide-y divide-ink-800 overflow-hidden">
                {g.items.map(({ pic, code, sinceCheck, kpe, shiftClass, mh, tier }) => {
                  const sinceLabel =
                    sinceCheck == null ? '—' : sinceCheck === 0 ? 'now' : formatElapsed(sinceCheck)
                  return (
                    <div
                      key={pic.id}
                      onClick={() => onPicClick?.(pic.id)}
                      className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 cursor-pointer transition hover:bg-ink-800/40 ${
                        tier === 0 ? 'bg-code-1/5' : ''
                      }`}
                    >
                      <CodeSquare code={code} />

                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-ink-100 truncate">
                          <span className="tabular-nums text-ink-400">#{pic.number}</span>{' '}
                          {pic.name?.trim() || pic.description?.trim() || (
                            <span className="text-ink-500 italic font-medium">no name</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-ink-500 truncate">
                          {kpe ? (
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <span className={`w-2 h-2 rounded-full ${shiftClass} shrink-0`} />
                              <span className="truncate">{kpe}</span>
                            </span>
                          ) : (
                            <span className="italic text-ink-600">no KPE</span>
                          )}
                          {mh && <span className="text-code-2 font-bold shrink-0" title="Has been Code 2">⚑</span>}
                          {pic.ejectionFlag && (
                            <ShieldIcon className="w-3 h-3 shrink-0" title="Security flag" />
                          )}
                        </div>
                      </div>

                      <div className={`text-sm tabular-nums shrink-0 ${sinceToneFor(tier)}`}>{sinceLabel}</div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markChecked(pic)
                        }}
                        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-display font-bold transition ${
                          tier === 0
                            ? 'bg-code-1 text-white hover:opacity-90'
                            : tier === 1
                            ? 'bg-code-3 text-ink-950 hover:opacity-90'
                            : 'bg-ink-800 border border-ink-700 text-ink-200 hover:border-ink-500'
                        }`}
                      >
                        Check
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
