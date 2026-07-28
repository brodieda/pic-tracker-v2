import { useMemo, useState } from 'react'
import {
  currentCodeFor,
  code3MonitorStateFor,
  getAssignedKpe,
  shiftFor,
  elapsedMinutes,
  formatElapsed,
  formatClock,
  wasEverCode2,
  normalizeReferredBy,
  normalizeReferredTo,
} from '../lib/helpers'
import { completenessFor } from '../lib/completeness'
import { CODES } from '../constants/options'
import { columnsFor, getVisibleColumns, setVisibleColumns } from '../lib/tableColumns'
import ShieldIcon from './ShieldIcon'

const abbrevGender = (g) =>
  g === 'Feminine' ? 'F' : g === 'Masculine' ? 'M' : g === 'Non-binary' ? 'NB' : g || ''
const gaLabel = (p) =>
  [p.gender ? abbrevGender(p.gender) : null, p.ageRange || null].filter(Boolean).join(' · ')

function CodeSquare({ code }) {
  const cfg = CODES.find((c) => c.code === code)
  if (!cfg)
    return (
      <span className="inline-flex w-6 h-6 rounded bg-ink-800 border border-ink-700 text-ink-500 items-center justify-center text-xs font-bold">
        —
      </span>
    )
  const tone = code === 3 ? 'text-ink-950' : 'text-white'
  return (
    <span className={`inline-flex w-6 h-6 rounded ${cfg.tw} ${tone} items-center justify-center text-xs font-display font-bold`}>
      {code}
    </span>
  )
}

const dash = <span className="text-ink-600">–</span>
const missTag = <span className="text-[11px] italic bg-code-3/25 text-code-3 rounded px-1.5 py-0.5">missing</span>

function ColumnsButton({ tableKey, visible, onChange }) {
  const [open, setOpen] = useState(false)
  const cols = columnsFor(tableKey)
  const toggle = (key) => {
    const set = new Set(visible)
    if (set.has(key)) set.delete(key)
    else set.add(key)
    onChange(cols.filter((c) => set.has(c.key)).map((c) => c.key)) // keep column order
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-display font-bold bg-ink-100 text-ink-950 rounded-md px-2.5 py-1.5"
      >
        ▤ Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 bg-ink-900 border border-ink-700 rounded-xl shadow-2xl p-2">
            <div className="text-[10px] tracking-[0.16em] uppercase text-ink-500 px-2 pb-1.5">Columns</div>
            {cols.map((c) => {
              const on = visible.includes(c.key)
              return (
                <button
                  key={c.key}
                  disabled={c.locked}
                  onClick={() => toggle(c.key)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm ${
                    c.locked ? 'opacity-50 cursor-default' : 'hover:bg-ink-800'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                      on ? 'bg-ink-100 border-ink-100 text-ink-950' : 'border-ink-600 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-ink-200">{c.label}</span>
                  {c.locked && <span className="ml-auto text-[9px] uppercase tracking-widest text-ink-600">lock</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function TableBoard({ pics, events, eventCfg, onPicClick }) {
  const [inCareCols, setInCareCols] = useState(() => getVisibleColumns('incare'))
  const [dischCols, setDischCols] = useState(() => getVisibleColumns('discharged'))

  const setInCare = (keys) => {
    setVisibleColumns('incare', keys)
    setInCareCols(keys)
  }
  const setDisch = (keys) => {
    setVisibleColumns('discharged', keys)
    setDischCols(keys)
  }

  const now = Date.now()

  const inCareRows = useMemo(
    () =>
      (pics || [])
        .filter((p) => p.status === 'in_care')
        .map((p) => {
          const code = currentCodeFor(p.id, events)
          const monitor = code3MonitorStateFor(p.id, events, eventCfg, now)
          const kpe = getAssignedKpe(p)
          const shift = shiftFor(kpe, eventCfg)
          return {
            pic: p,
            code,
            overdue: monitor === 'overdue',
            kpe,
            shiftClass: shift === 1 ? 'bg-shift-1' : shift === 2 ? 'bg-shift-2' : 'bg-ink-600',
            elapsed: elapsedMinutes(p.enteredCare, now),
            missing: completenessFor(p).missingFields,
          }
        })
        .sort((a, b) => b.pic.number - a.pic.number),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pics, events, eventCfg]
  )

  const dischRows = useMemo(
    () =>
      (pics || [])
        .filter((p) => p.status === 'discharged')
        .map((p) => ({
          pic: p,
          duration: elapsedMinutes(p.enteredCare, p.leftCare ? new Date(p.leftCare).getTime() : now),
          kpe: p.lastKpe || getAssignedKpe(p),
        }))
        .sort((a, b) => (b.pic.leftCare || '').localeCompare(a.pic.leftCare || '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pics, events]
  )

  const inCareCell = (key, row) => {
    const { pic, code, overdue, kpe, shiftClass, elapsed, missing } = row
    switch (key) {
      case 'number':
        return <span className="font-display font-black tabular-nums">{pic.number}</span>
      case 'code':
        return <CodeSquare code={code} />
      case 'name':
        return pic.name?.trim() ? (
          <span className="font-semibold text-ink-100">{pic.name}</span>
        ) : missing.has('identifier') ? (
          missTag
        ) : (
          <span className="text-ink-500 italic">no name</span>
        )
      case 'description':
        return pic.description?.trim() ? <span className="text-ink-300">{pic.description}</span> : dash
      case 'ga':
        return gaLabel(pic) || dash
      case 'kpe':
        return kpe ? (
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${shiftClass}`} />
            {kpe}
          </span>
        ) : missing.has('assignedKpe') ? (
          missTag
        ) : (
          dash
        )
      case 'refBy': {
        const v = normalizeReferredBy(pic)
        return v && v.length ? v.join(', ') : dash
      }
      case 'substances':
        return pic.substances?.length ? (
          pic.substances.join(', ')
        ) : missing.has('substancesOrPresentations') ? (
          missTag
        ) : (
          dash
        )
      case 'presentations':
        return pic.presentations?.length ? pic.presentations.join(', ') : dash
      case 'time':
        return (
          <span className={`tabular-nums font-semibold ${overdue ? 'text-code-1' : 'text-ink-300'}`}>
            {formatElapsed(elapsed)}
          </span>
        )
      case 'flags':
        return (
          <span className="inline-flex items-center gap-1.5">
            {wasEverCode2(pic.id, events) && (
              <span className="text-code-2" title="Has been Code 2">⚑</span>
            )}
            {pic.ejectionFlag && (
              <span className="secflag-on inline-flex items-center rounded px-1 py-0.5" title="Security flag">
                <ShieldIcon className="w-3 h-3" />
              </span>
            )}
          </span>
        )
      default:
        return null
    }
  }

  const dischCell = (key, row) => {
    const { pic, duration, kpe } = row
    switch (key) {
      case 'number':
        return <span className="font-display font-black tabular-nums">{pic.number}</span>
      case 'name':
        return pic.name?.trim() ? (
          <span className="font-semibold text-ink-100">{pic.name}</span>
        ) : (
          <span className="text-ink-500 italic">{pic.description?.trim() || 'no name'}</span>
        )
      case 'ga':
        return gaLabel(pic) || dash
      case 'timeOut':
        return <span className="tabular-nums text-ink-300">{formatClock(pic.leftCare)}</span>
      case 'duration':
        return <span className="tabular-nums text-ink-300">{formatElapsed(duration)}</span>
      case 'outcome': {
        const o = pic.outcome === 'Other' ? pic.outcomeOther : pic.outcome
        return o ? <span className="tag">{o}</span> : dash
      }
      case 'kpe':
        return kpe || dash
      case 'medical':
        return pic.medicalInvolved === true ? (
          <span className="text-code-1 font-bold" title="Medical involved">⚕</span>
        ) : (
          dash
        )
      case 'refTo': {
        const v = normalizeReferredTo(pic)
        return v && v.length ? v.join(', ') : dash
      }
      case 'secNotified':
        if (!pic.ejectionFlag) return dash
        return pic.securityNotified === true ? (
          <span className="text-code-5 font-semibold">Yes</span>
        ) : pic.securityNotified === false ? (
          <span className="text-code-1 font-semibold">No</span>
        ) : (
          <span className="text-ink-500">n/a</span>
        )
      case 'tlSignoff':
        return pic.tlSignoff || dash
      default:
        return null
    }
  }

  const inCareVisible = columnsFor('incare').filter((c) => inCareCols.includes(c.key))
  const dischVisible = columnsFor('discharged').filter((c) => dischCols.includes(c.key))

  const Table = ({ cols, rows, renderCell, rowClass, emptyText }) => (
    <div className="overflow-x-auto rounded-xl border border-ink-800">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-ink-900">
            {cols.map((c) => (
              <th
                key={c.key}
                className="text-left text-[10px] tracking-[0.08em] uppercase text-ink-500 font-display font-bold px-3 py-2.5 border-b border-ink-800 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-3 py-8 text-center text-ink-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.pic.id}
                onClick={() => onPicClick?.(row.pic)}
                className={`cursor-pointer transition hover:bg-ink-800/40 ${rowClass ? rowClass(row) : ''}`}
              >
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-2 border-b border-ink-800/60 whitespace-nowrap">
                    {renderCell(c.key, row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6" data-view="table">
      <section>
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="w-2 h-2 rounded-full bg-code-5" />
          <h3 className="font-display font-bold text-sm tracking-wide uppercase">In care · {inCareRows.length}</h3>
          <div className="ml-auto">
            <ColumnsButton tableKey="incare" visible={inCareCols} onChange={setInCare} />
          </div>
        </div>
        <Table
          cols={inCareVisible}
          rows={inCareRows}
          renderCell={inCareCell}
          rowClass={(r) => (r.overdue ? 'bg-code-1/5' : '')}
          emptyText="No one is currently in care."
        />
      </section>

      <section>
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="w-2 h-2 rounded-full bg-ink-500" />
          <h3 className="font-display font-bold text-sm tracking-wide uppercase text-ink-400">
            Discharged · {dischRows.length}
          </h3>
          <div className="ml-auto">
            <ColumnsButton tableKey="discharged" visible={dischCols} onChange={setDisch} />
          </div>
        </div>
        <Table cols={dischVisible} rows={dischRows} renderCell={dischCell} emptyText="No discharged PICs yet." />
      </section>
    </div>
  )
}
