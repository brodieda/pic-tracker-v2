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

export default function Reports({ refreshKey }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [includeInCare, setIncludeInCare] = useState(false)
  const [exportStatus, setExportStatus] = useState(null) // {ok, msg} | null

  const reload = () => {
    setPics(getPics())
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    reload()
  }, [refreshKey])

  // Reports default to discharged-only; toggle includes in-care
  const filteredPics = useMemo(() => {
    return includeInCare ? pics : pics.filter((p) => p.status === 'discharged')
  }, [pics, includeInCare])

  const stats = useMemo(() => computeAllStats(filteredPics, events), [filteredPics, events])

  const cohortLabel = includeInCare ? 'all PICs (in-care + discharged)' : 'discharged PICs only'

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">
              / reports · retrospective
            </p>
            <h2 className="text-3xl font-display font-bold">
              {eventCfg.name || 'Untitled event'}
            </h2>
            <p className="text-sm text-ink-400 mt-1">
              Showing stats from {cohortLabel} · {filteredPics.length} record{filteredPics.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none panel px-3 py-2">
              <input
                type="checkbox"
                checked={includeInCare}
                onChange={(e) => setIncludeInCare(e.target.checked)}
                className="accent-ink-100"
              />
              <span className="text-xs font-display tracking-wide text-ink-200">
                Include in-care
              </span>
            </label>
            {/* Export */}
            <ExportButton
              filteredPics={filteredPics}
              events={events}
              eventCfg={eventCfg}
              includeInCare={includeInCare}
              onStatus={setExportStatus}
            />
          </div>
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
            {includeInCare ? 'No PICs this event yet.' : 'No discharges yet.'}
          </p>
          <p className="text-ink-500 text-sm mt-2">
            {!includeInCare && 'Tick "Include in-care" to see live data.'}
          </p>
        </div>
      ) : (
        <>
          {/* Top row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatBigNumber
              label="Total in cohort"
              value={stats.counts.total}
            />
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
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBigNumber
              label="Code 1 incidents"
              value={stats.severity.code1}
              tone={stats.severity.code1 > 0 ? 'danger' : null}
            />
            <StatBigNumber
              label="MH flagged"
              value={stats.severity.persistentMh}
              tone={stats.severity.persistentMh > 0 ? 'mh' : null}
            />
            <StatBigNumber
              label="Medical involved"
              value={stats.medical.count}
              suffix={stats.medical.pct != null ? `(${stats.medical.pct}%)` : null}
              tone={stats.medical.count > 0 ? 'danger' : null}
            />
            <StatBigNumber
              label="Incomplete records"
              value={stats.counts.incomplete}
              tone={stats.counts.incomplete > 0 ? 'warn' : 'good'}
              hint={stats.counts.incomplete > 0 ? 'PICs with missing info' : 'All complete'}
            />
          </div>

          {/* Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <StatSection title="Highest code reached">
              <CodeDistribution items={stats.severity.highestCodeDistribution} />
            </StatSection>
            <StatSection title="Outcomes">
              <StatBarList
                items={stats.frequencies.outcomes}
                highlightTone="bg-code-5"
                emptyText="No outcomes recorded"
              />
            </StatSection>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <StatSection title="Top substances">
              <StatBarList
                items={stats.frequencies.substances}
                highlightTone="bg-shift-2"
                emptyText="No substances recorded"
              />
            </StatSection>
            <StatSection title="Top presentations">
              <StatBarList
                items={stats.frequencies.presentations}
                highlightTone="bg-shift-1"
                emptyText="No presentations recorded"
              />
            </StatSection>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatSection title="Referred by">
              <StatBarList
                items={stats.frequencies.referredBy}
                highlightTone="bg-code-3"
                emptyText="No referrals recorded"
              />
            </StatSection>
            <StatSection title="Referred to">
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

function ExportButton({ filteredPics, events, eventCfg, includeInCare, onStatus }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      className="btn-primary"
      disabled={filteredPics.length === 0 || busy}
      onClick={async () => {
        setBusy(true)
        try {
          const result = await exportXlsx({
            pics: filteredPics,
            events,
            eventCfg,
            cohortLabel: includeInCare ? 'all' : 'discharged',
          })
          onStatus({
            ok: true,
            msg: `Exported ${result.picCount} PIC${result.picCount === 1 ? '' : 's'} & ${result.eventCount} event${result.eventCount === 1 ? '' : 's'} → ${result.filename}`,
          })
          setTimeout(() => onStatus(null), 6000)
        } catch (err) {
          console.error('Export failed', err)
          onStatus({ ok: false, msg: 'Export failed — check browser console.' })
          setTimeout(() => onStatus(null), 6000)
        } finally {
          setBusy(false)
        }
      }}
      title="Download an Excel workbook with two sheets: PICs and Events log"
    >
      {busy ? 'Exporting…' : '⬇ Export XLSX'}
    </button>
  )
}
