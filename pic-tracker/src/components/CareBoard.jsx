import { useEffect, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import PicCard from './PicCard'
import { currentCodeFor } from '../lib/helpers'

export default function CareBoard({ refreshKey, onAddPic, onPicClick }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [tick, setTick] = useState(0)

  // Reload when refreshKey changes
  useEffect(() => {
    setPics(getPics())
    setEvents(getEvents())
    setEventCfg(getEvent())
  }, [refreshKey])

  // Tick once a minute so elapsed times stay live
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Sort: in-care by descending severity (lowest code = most severe first), then by entry time
  const inCare = pics
    .filter((p) => p.status === 'in_care')
    .map((p) => ({ p, code: currentCodeFor(p.id, events) ?? 99 }))
    .sort((a, b) => {
      if (a.code !== b.code) return a.code - b.code
      return new Date(a.p.enteredCare) - new Date(b.p.enteredCare)
    })
    .map((x) => x.p)

  const discharged = pics
    .filter((p) => p.status === 'discharged')
    .sort((a, b) => new Date(b.leftCare || 0) - new Date(a.leftCare || 0))

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      {/* Subhead */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ care board</p>
          <h2 className="text-3xl font-display font-bold">
            {eventCfg.name || 'Untitled event'}
          </h2>
        </div>
        <button onClick={onAddPic} className="btn-primary text-base px-5 py-3">
          + New PIC
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5" data-tick={tick}>
        {/* In Care */}
        <section className="space-y-3">
          <header className="flex items-center gap-3 px-1">
            <span className="w-2 h-2 rounded-full bg-code-1 animate-pulse" />
            <h3 className="font-display font-bold uppercase tracking-[0.18em] text-sm text-ink-300">
              In care
            </h3>
            <span className="text-xs text-ink-500 font-display tabular-nums">
              {inCare.length}
            </span>
          </header>

          {inCare.length === 0 ? (
            <div className="panel p-10 text-center">
              <p className="text-ink-500 font-display tracking-wide">No PICs currently in care.</p>
              <button onClick={onAddPic} className="btn-ghost mt-4">
                + Admit first PIC
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {inCare.map((pic) => (
                <PicCard
                  key={pic.id}
                  pic={pic}
                  events={events}
                  eventCfg={eventCfg}
                  onClick={() => onPicClick?.(pic)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Discharged */}
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
              <p className="text-ink-600 text-xs mt-1">Phase 2 will add discharge flow.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {discharged.map((pic) => (
                <PicCard
                  key={pic.id}
                  pic={pic}
                  events={events}
                  eventCfg={eventCfg}
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
