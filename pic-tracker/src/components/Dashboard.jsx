import { useEffect, useMemo, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import { computeAllStats } from '../lib/stats'
import { formatElapsed } from '../lib/helpers'
import {
  StatBigNumber,
  StatBarList,
  CodeDistribution,
  StatSection,
} from './StatBlocks'

export default function Dashboard({ refreshKey }) {
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

  // Tick every 30s so live stats stay current
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Dashboard always uses the full event cohort (in-care + discharged)
  const stats = useMemo(() => computeAllStats(pics, events), [pics, events, tick])

  const capacity = eventCfg.capacity
  const inCareCount = stats.counts.inCare
  const spacesRemaining = capacity != null ? Math.max(0, capacity - inCareCount) : null
  const atCapacity = capacity != null && inCareCount >= capacity
  const nearCapacity = capacity != null && !atCapacity && spacesRemaining <= 3

  let capacityValue = `${inCareCount}`
  let capacitySuffix = capacity != null ? `/ ${capacity}` : null
  let capacityTone = null
  let capacityHint = capacity == null ? 'No capacity set' : `${spacesRemaining} ${spacesRemaining === 1 ? 'space' : 'spaces'} free`
  if (atCapacity) {
    capacityTone = 'danger'
    capacityHint = 'AT CAPACITY'
  } else if (nearCapacity) {
    capacityTone = 'warn'
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto" data-tick={tick}>
      <header className="mb-6">
        <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">
          / dashboard · live
        </p>
        <h2 className="text-3xl font-display font-bold">
          {eventCfg.name || 'Untitled event'}
        </h2>
        <p className="text-sm text-ink-400 mt-1">
          Stats include all PICs this event — in care plus discharged.
        </p>
      </header>

      {/* Top row: headline numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatBigNumber
          label="Total this event"
          value={stats.counts.total}
        />
        <StatBigNumber
          label="In care now"
          value={capacityValue}
          suffix={capacitySuffix}
          tone={capacityTone}
          hint={capacityHint}
        />
        <StatBigNumber
          label="Discharged"
          value={stats.counts.discharged}
        />
        <StatBigNumber
          label="Code 1 incidents"
          value={stats.severity.code1}
          tone={stats.severity.code1 > 0 ? 'danger' : null}
        />
      </div>

      {/* Second row: time + MH + incomplete */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatBigNumber
          label="Avg time in care"
          value={stats.times.avg != null ? formatElapsed(stats.times.avg) : '—'}
        />
        <StatBigNumber
          label="Median"
          value={stats.times.median != null ? formatElapsed(stats.times.median) : '—'}
        />
        <StatBigNumber
          label="Longest"
          value={stats.times.longest != null ? formatElapsed(stats.times.longest) : '—'}
        />
        <StatBigNumber
          label="MH flagged"
          value={stats.severity.persistentMh}
          tone={stats.severity.persistentMh > 0 ? 'mh' : null}
          hint="Ever Code 2 this episode"
        />
      </div>

      {/* Third row: incomplete records callout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBigNumber
          label="Incomplete records"
          value={stats.counts.incomplete}
          tone={stats.counts.incomplete > 0 ? 'warn' : 'good'}
          hint={stats.counts.incomplete > 0 ? 'PICs with missing info' : 'All records complete'}
        />
      </div>

      {/* Distribution + medical */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <StatSection title="Highest code reached">
          <CodeDistribution items={stats.severity.highestCodeDistribution} />
        </StatSection>
        <StatSection title="Medical involvement">
          {stats.medical.pct == null ? (
            <p className="text-xs text-ink-500 italic">No discharge data yet — can't compute</p>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="font-display font-black text-4xl tabular-nums text-code-1">
                {stats.medical.count}
              </span>
              <span className="text-ink-400 text-sm">
                <span className="font-bold text-ink-200">{stats.medical.pct}%</span> of those discharged
                with answer recorded
              </span>
            </div>
          )}
        </StatSection>
      </div>

      {/* Frequencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatSection title="Top substances">
          <StatBarList
            items={stats.frequencies.substances}
            highlightTone="bg-shift-2"
            emptyText="No substances recorded yet"
          />
        </StatSection>
        <StatSection title="Top presentations">
          <StatBarList
            items={stats.frequencies.presentations}
            highlightTone="bg-shift-1"
            emptyText="No presentations recorded yet"
          />
        </StatSection>
        <StatSection title="Referred by">
          <StatBarList
            items={stats.frequencies.referredBy}
            highlightTone="bg-code-3"
            emptyText="No referrals recorded yet"
          />
        </StatSection>
        <StatSection title="Outcomes">
          <StatBarList
            items={stats.frequencies.outcomes}
            highlightTone="bg-code-5"
            emptyText="No discharges yet"
          />
        </StatSection>
      </div>

      {/* Ref-to as a third row, full width */}
      {stats.frequencies.referredTo.length > 0 && (
        <div className="mt-4">
          <StatSection title="Referred to (post-discharge)">
            <StatBarList
              items={stats.frequencies.referredTo}
              highlightTone="bg-ink-500"
            />
          </StatSection>
        </div>
      )}
    </div>
  )
}
