import { useEffect, useMemo, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import { computeAllStats } from '../lib/stats'
import { formatElapsed } from '../lib/helpers'
import { exportXlsx } from '../lib/xlsxExport'
import {
  StatBigNumber,
  StatBarList,
  CodeDistribution,
  StatSection,
} from './StatBlocks'
import TimeSeriesChart from './TimeSeriesChart'

// Stats — replaces the old separate Dashboard + Reports pages, which were
// showing largely the same numbers in two different layouts. Defaults to
// the full cohort (in-care + discharged) since that's the more useful view
// mid-event; tick "Discharged only" for an end-of-event reporting cohort.
export default function Stats({ refreshKey }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [dischargedOnly, setDischargedOnly] = useState(false)
  const [tick, setTick] = useState(0)
  const [exportStatus, setExportStatus] = useState(null) // {ok, msg} | null
  const [exporting, setExporting] = useState(false)

  const reload = () => {
    setPics(getPics())
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    reload()
  }, [refreshKey])

  // Tick every 30s so live stats stay current between syncs
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const filteredPics = useMemo(() => {
    return dischargedOnly ? pics.filter((p) => p.status === 'discharged') : pics
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pics, dischargedOnly, tick])

  const stats = useMemo(() => computeAllStats(filteredPics, events), [filteredPics, events])

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

  const cohortLabel = dischargedOnly ? 'discharged PICs only' : 'all PICs (in-care + discharged)'

  const onExport = async () => {
    if (filteredPics.length === 0 || exporting) return
    setExporting(true)
    try {
      const result = await exportXlsx({
        pics: filteredPics,
        events,
        eventCfg,
        cohortLabel: dischargedOnly ? 'discharged' : 'all',
      })
      setExportStatus({
        ok: true,
        msg: `Exported ${result.picCount} PIC${result.picCount === 1 ? '' : 's'} & ${result.eventCount} event${result.eventCount === 1 ? '' : 's'} → ${result.filename}`,
      })
      setTimeout(() => setExportStatus(null), 6000)
    } catch (err) {
      console.error('Export failed', err)
      setExportStatus({ ok: false, msg: 'Export failed — check browser console.' })
      setTimeout(() => setExportStatus(null), 6000)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto" data-tick={tick}>
      <header className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ stats</p>
          <h2 className="text-3xl font-display font-bold">{eventCfg.name || 'Untitled event'}</h2>
          <p className="text-sm text-ink-400 mt-1">
            Showing {cohortLabel} &middot; {filteredPics.length} record{filteredPics.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none panel px-3 py-2">
            <input
              type="checkbox"
              checked={dischargedOnly}
              onChange={(e) => setDischargedOnly(e.target.checked)}
              className="accent-ink-100"
            />
            <span className="text-xs font-display tracking-wide text-ink-200">Discharged only</span>
          </label>
          <button
            className="btn-primary"
            disabled={filteredPics.length === 0 || exporting}
            onClick={onExport}
            title="Download an Excel workbook with two sheets: PICs and Events log"
          >
            {exporting ? 'Exporting…' : '⬇ Export XLSX'}
          </button>
        </div>
      </header>

      {exportStatus && (
        <div
          className={`panel mb-4 px-4 py-3 text-sm font-display ${
            exportStatus.ok ? 'border-code-5/40 bg-code-5/10 text-code-5' : 'border-code-1/40 bg-code-1/10 text-code-1'
          }`}
        >
          {exportStatus.msg}
        </div>
      )}

      {filteredPics.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-ink-400 text-lg font-display">
            {dischargedOnly ? 'No discharges yet.' : 'No PICs this event yet.'}
          </p>
          {dischargedOnly && <p className="text-ink-500 text-sm mt-2">Untick "Discharged only" to see live data.</p>}
        </div>
      ) : (
        <>
          {/* Top row: headline numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatBigNumber label="Total this event" value={stats.counts.total} />
            <StatBigNumber
              label="In care now"
              value={capacityValue}
              suffix={capacitySuffix}
              tone={capacityTone}
              hint={capacityHint}
            />
            <StatBigNumber label="Discharged" value={stats.counts.discharged} />
            <StatBigNumber
              label="Code 1 incidents"
              value={stats.severity.code1}
              tone={stats.severity.code1 > 0 ? 'danger' : null}
            />
          </div>

          {/* Time stats + MH */}
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

          {/* Medical / security / incomplete */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBigNumber
              label="Medical involved"
              value={stats.medical.count}
              suffix={stats.medical.pct != null ? `(${stats.medical.pct}%)` : null}
              tone={stats.medical.count > 0 ? 'danger' : null}
            />
            <StatBigNumber
              label="Security Flag"
              value={stats.security.flagged}
              suffix={
                stats.security.notification.total > 0
                  ? `(${stats.security.notification.notified}/${stats.security.notification.total} notified)`
                  : null
              }
              tone={
                stats.security.notification.notNotified > 0
                  ? 'danger'
                  : stats.security.flagged > 0
                  ? 'warn'
                  : null
              }
              hint={
                stats.security.notification.notNotified > 0
                  ? `${stats.security.notification.notNotified} discharged without security notified`
                  : null
              }
            />
            <StatBigNumber
              label="Incomplete records"
              value={stats.counts.incomplete}
              tone={stats.counts.incomplete > 0 ? 'warn' : 'good'}
              hint={stats.counts.incomplete > 0 ? 'PICs with missing info' : 'All records complete'}
            />
          </div>

          {/* Concurrent load over time */}
          <div className="mb-4">
            <StatSection title={`PICs in care over time (${cohortLabel})`}>
              <TimeSeriesChart pics={filteredPics} />
            </StatSection>
          </div>

          {/* Distribution + medical */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <StatSection title="Highest code reached">
              <CodeDistribution items={stats.severity.highestCodeDistribution} />
            </StatSection>
            <StatSection title="Outcomes">
              <StatBarList
                items={stats.frequencies.outcomes}
                highlightTone="bg-code-5"
                emptyText="No discharges yet"
              />
            </StatSection>
          </div>

          {/* Frequencies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatSection title="Referred by">
              <StatBarList
                items={stats.frequencies.referredBy}
                highlightTone="bg-code-3"
                emptyText="No referrals recorded yet"
              />
            </StatSection>
            <StatSection title="Referred to (post-discharge)">
              <StatBarList
                items={stats.frequencies.referredTo}
                highlightTone="bg-ink-500"
                emptyText="No post-discharge referrals recorded"
              />
            </StatSection>
          </div>
        </>
      )}
    </div>
  )
}
