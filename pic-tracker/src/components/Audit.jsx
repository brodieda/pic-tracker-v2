import { useEffect, useMemo, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import {
  currentCodeFor,
  highestCodeFor,
  getAssignedKpe,
  formatClock,
  changePicCode,
  changePicKpe,
  updatePicFields,
  updatePicEnteredCare,
  updatePicLeftCare,
  unassignedKpes,
  normalizeReferredBy,
  normalizeReferredTo,
} from '../lib/helpers'
import { completenessFor, isIncomplete } from '../lib/completeness'
import { CODES, SUBSTANCES, PRESENTATIONS, OUTCOMES, REFERRED_BY, REFERRED_TO, GENDERS, AGE_RANGES } from '../constants/options'
import { columnsFor, getVisibleColumns, setVisibleColumns } from '../lib/tableColumns'
import { Sel, Multi, Txt, inputCls, ColumnsButton, abbrevGender, gaLabel } from './TableBoard'
import TimeDateEditor from './TimeDateEditor'

const CODE_COLOR = { 1: 'bg-code-1', 2: 'bg-code-2', 3: 'bg-code-3', 4: 'bg-code-4', 5: 'bg-code-5' }
const dash = <span className="text-ink-600">—</span>
const inCareDash = <span className="text-ink-600">— in care —</span>

function CodeBadge({ code }) {
  if (code == null) return dash
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-display font-black text-white ${
        CODE_COLOR[code] || 'bg-ink-600'
      }`}
    >
      {code}
    </span>
  )
}

// Click-to-edit time cell — opens the same manual HH:MM editor used
// everywhere else (admit time, discharge time), no native OS picker.
function TimeCell({ value, onCommit }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((v) => !v)} className={`${inputCls} w-20 text-center tabular-nums`}>
        {formatClock(value)}
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 w-56 dropdown-panel bg-ink-900 border border-ink-700 rounded-lg shadow-2xl p-3">
          <TimeDateEditor value={value} mode="live" onCommit={onCommit} />
          <button onClick={() => setOpen(false)} className="btn-primary w-full mt-1 text-sm">
            Done
          </button>
        </div>
      )}
    </span>
  )
}

// Audit — the completeness table from the old Reports page. Time In/Out,
// Referred by/to, and Highest code added per feedback; columns are now
// hide/show/reorder-able via the same ColumnsButton Table view uses.
export default function Audit({ refreshKey, onPicClick }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [search, setSearch] = useState('')
  const [incompleteOnly, setIncompleteOnly] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [cols, setCols] = useState(() => getVisibleColumns('audit'))
  const [sortDir, setSortDir] = useState('asc')

  const reload = () => {
    setPics(getPics())
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    reload()
  }, [refreshKey])

  const save = (fn) => {
    fn()
    reload()
  }

  const setVisible = (keys) => {
    setVisibleColumns('audit', keys)
    setCols(keys)
  }

  const kpeOptions = useMemo(
    () =>
      Array.from(
        new Set([...(eventCfg.shift1Team || []), ...(eventCfg.shift2Team || []), ...unassignedKpes(pics, eventCfg)]),
      ),
    [eventCfg, pics],
  )

  const allRows = useMemo(() => {
    return [...pics]
      .map((p) => ({ pic: p, mf: completenessFor(p).missingFields, incomplete: isIncomplete(p) }))
      .sort((a, b) => {
        const diff = (a.pic.number || 0) - (b.pic.number || 0)
        return sortDir === 'desc' ? -diff : diff
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pics, sortDir])

  const incompleteCount = allRows.filter((r) => r.incomplete).length

  const searchNorm = search.trim().toLowerCase().replace(/^#/, '')
  const rows = allRows.filter(({ pic, incomplete }) => {
    if (incompleteOnly && !incomplete) return false
    if (!searchNorm) return true
    const num = String(pic.number ?? '')
    const name = (pic.name || '').toLowerCase()
    const desc = (pic.description || '').toLowerCase()
    return num.includes(searchNorm) || name.includes(searchNorm) || desc.includes(searchNorm)
  })

  const miss = <span className="italic text-code-3 font-semibold">missing</span>
  const colDefs = columnsFor('audit')
  const label = (key) => colDefs.find((c) => c.key === key)?.label || key

  // Renders one cell's content + whether it should get the yellow
  // missing-field tint, for a given column key + row.
  function renderCell(key, row) {
    const { pic, mf } = row
    const discharged = pic.status === 'discharged'
    const code = currentCodeFor(pic.id, events)
    const kpe = getAssignedKpe(pic)
    const subs = [
      ...(pic.substances || []).filter((s) => s !== 'Other'),
      ...(pic.substances?.includes('Other') && pic.substanceOther ? [pic.substanceOther] : []),
    ]
    const pres = [
      ...(pic.presentations || []).filter((s) => s !== 'Other'),
      ...(pic.presentations?.includes('Other') && pic.presentationOther ? [pic.presentationOther] : []),
    ]
    const subPresMissing = mf.has('substancesOrPresentations')
    const refBy = normalizeReferredBy(pic)[0]
    const refTo = normalizeReferredTo(pic)[0]

    switch (key) {
      case 'number':
        return [<span className="tabular-nums font-display font-semibold">#{pic.number}</span>, false]

      case 'status':
        return [
          discharged ? (
            <span className="text-ink-400">Discharged</span>
          ) : (
            <span className="text-code-5 font-semibold">In care</span>
          ),
          false,
        ]

      case 'code':
        return [
          editMode ? (
            <Sel
              value={code ?? ''}
              width="w-16"
              options={CODES.map((c) => ({ value: c.code, label: c.code }))}
              onChange={(v) => save(() => changePicCode(pic.id, Number(v), kpe || null))}
            />
          ) : (
            <CodeBadge code={code} />
          ),
          false,
        ]

      case 'highestCode':
        return [<CodeBadge code={highestCodeFor(pic.id, events)} />, false]

      case 'name':
        return [
          editMode ? (
            <Txt value={pic.name || ''} placeholder="name" onSave={(v) => save(() => updatePicFields(pic.id, { name: v || null }))} />
          ) : mf.has('identifier') && !pic.name?.trim() && !pic.description?.trim() ? (
            miss
          ) : (
            pic.name?.trim() || dash
          ),
          mf.has('identifier') && !pic.name?.trim() && !pic.description?.trim(),
        ]

      case 'description':
        return [
          editMode ? (
            <Txt value={pic.description || ''} placeholder="description" onSave={(v) => save(() => updatePicFields(pic.id, { description: v || null }))} />
          ) : (
            pic.description?.trim() || dash
          ),
          false,
        ]

      case 'ga':
        return [
          editMode ? (
            <span className="inline-flex gap-1">
              <Sel
                value={pic.gender}
                width="w-16"
                placeholder="G"
                options={GENDERS.map((g) => ({ value: g, label: abbrevGender(g) }))}
                onChange={(v) => save(() => updatePicFields(pic.id, { gender: v || null }))}
              />
              <Sel
                value={pic.ageRange}
                width="w-20"
                placeholder="age"
                options={AGE_RANGES}
                onChange={(v) => save(() => updatePicFields(pic.id, { ageRange: v || null }))}
              />
            </span>
          ) : (
            gaLabel(pic) || dash
          ),
          false,
        ]

      case 'kpe':
        return [
          editMode ? (
            <Sel
              value={kpe || ''}
              options={kpeOptions}
              placeholder="unassigned"
              onChange={(v) => save(() => changePicKpe(pic.id, v || null, null))}
            />
          ) : mf.has('assignedKpe') ? (
            miss
          ) : (
            kpe || '—'
          ),
          mf.has('assignedKpe'),
        ]

      case 'timeIn':
        return [
          <TimeCell value={pic.enteredCare} onCommit={(iso) => save(() => updatePicEnteredCare(pic.id, iso))} />,
          false,
        ]

      case 'timeOut':
        return discharged
          ? [<TimeCell value={pic.leftCare} onCommit={(iso) => save(() => updatePicLeftCare(pic.id, iso))} />, false]
          : [inCareDash, false]

      case 'refBy':
        return [
          editMode ? (
            <Sel value={refBy || ''} options={REFERRED_BY} onChange={(v) => save(() => updatePicFields(pic.id, { referredBy: v || null }))} />
          ) : (
            refBy || '—'
          ),
          false,
        ]

      case 'substances':
        return [
          editMode ? (
            <Multi selected={subs} options={SUBSTANCES} onChange={(arr) => save(() => updatePicFields(pic.id, { substances: arr }))} />
          ) : subPresMissing ? (
            miss
          ) : (
            subs.join(', ') || '—'
          ),
          subPresMissing,
        ]

      case 'presentations':
        return [
          editMode ? (
            <Multi selected={pres} options={PRESENTATIONS} onChange={(arr) => save(() => updatePicFields(pic.id, { presentations: arr }))} />
          ) : subPresMissing ? (
            miss
          ) : (
            pres.join(', ') || '—'
          ),
          subPresMissing,
        ]

      case 'outcome':
        if (!discharged) return [inCareDash, false]
        return [
          editMode ? (
            <Sel value={pic.outcome || ''} options={OUTCOMES} onChange={(v) => save(() => updatePicFields(pic.id, { outcome: v || null }))} />
          ) : mf.has('outcome') ? (
            miss
          ) : (
            pic.outcome || '—'
          ),
          mf.has('outcome'),
        ]

      case 'refTo':
        if (!discharged) return [inCareDash, false]
        return [
          editMode ? (
            <Sel value={refTo || ''} options={REFERRED_TO} onChange={(v) => save(() => updatePicFields(pic.id, { referredTo: v || null }))} />
          ) : mf.has('referredTo') ? (
            miss
          ) : (
            refTo || '—'
          ),
          mf.has('referredTo'),
        ]

      case 'tlSignoff':
        if (!discharged) return [inCareDash, false]
        return [
          editMode ? (
            <Sel value={pic.tlSignoff || ''} options={eventCfg?.tls || []} onChange={(v) => save(() => updatePicFields(pic.id, { tlSignoff: v || null }))} />
          ) : mf.has('tlSignoff') ? (
            miss
          ) : (
            pic.tlSignoff || '—'
          ),
          mf.has('tlSignoff'),
        ]

      case 'medical':
        if (!discharged) return [inCareDash, false]
        return [
          editMode ? (
            <Sel
              value={pic.medicalInvolved === true ? 'Yes' : pic.medicalInvolved === false ? 'No' : ''}
              width="w-20"
              options={['Yes', 'No']}
              onChange={(v) => save(() => updatePicFields(pic.id, { medicalInvolved: v === 'Yes' ? true : v === 'No' ? false : null }))}
            />
          ) : mf.has('medicalInvolved') ? (
            miss
          ) : pic.medicalInvolved == null ? (
            dash
          ) : (
            pic.medicalInvolved ? 'Yes' : 'No'
          ),
          discharged && mf.has('medicalInvolved'),
        ]

      case 'secFlag':
        return [
          editMode ? (
            <button
              onClick={() => save(() => updatePicFields(pic.id, { ejectionFlag: !pic.ejectionFlag }))}
              className={`${inputCls} w-16 text-center font-semibold ${pic.ejectionFlag ? 'text-code-1' : 'text-ink-500'}`}
            >
              {pic.ejectionFlag ? 'On' : 'Off'}
            </button>
          ) : pic.ejectionFlag ? (
            <span className="text-code-1 font-semibold">On</span>
          ) : (
            dash
          ),
          false,
        ]

      case 'secNotified':
        if (!pic.ejectionFlag) return [dash, false]
        if (!discharged) return [inCareDash, false]
        return [
          editMode ? (
            <Sel
              value={pic.securityNotified === true ? 'Yes' : pic.securityNotified === false ? 'No' : ''}
              width="w-20"
              options={['Yes', 'No']}
              onChange={(v) => save(() => updatePicFields(pic.id, { securityNotified: v === 'Yes' ? true : v === 'No' ? false : null }))}
            />
          ) : mf.has('securityNotified') ? (
            miss
          ) : pic.securityNotified == null ? (
            dash
          ) : (
            pic.securityNotified ? 'Yes' : 'No'
          ),
          discharged && mf.has('securityNotified'),
        ]

      case 'friends':
        return [
          (pic.friends || []).length > 0 ? (
            <span title={`${pic.friends.length} logged`}>
              👥 {pic.friends.filter((f) => f.inside).length}
            </span>
          ) : (
            dash
          ),
          false,
        ]

      default:
        return [dash, false]
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ audit</p>
          <h2 className="text-3xl font-display font-bold">
            {incompleteCount === 0 ? 'All records complete' : `${incompleteCount} of ${allRows.length} incomplete`}
          </h2>
          <p className="text-sm text-ink-400 mt-1">Missing fields highlighted</p>
        </div>
        <div className="flex items-center gap-2">
          <ColumnsButton tableKey="audit" visible={cols} onChange={setVisible} />
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`inline-flex items-center gap-2 text-xs font-display font-bold rounded-lg px-3 py-1.5 border transition ${
              editMode ? 'bg-shift-1 text-white border-white' : 'bg-ink-800 border-ink-700 text-ink-300 hover:border-ink-500'
            }`}
          >
            <span className={`w-8 h-4 rounded-full relative transition ${editMode ? 'bg-white/40' : 'bg-ink-600'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${editMode ? 'left-4' : 'left-0.5'}`} />
            </span>
            Edit {editMode ? 'on' : 'off'}
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="panel px-3 py-2 flex items-center gap-1.5 flex-1 min-w-[180px]">
          <span className="text-ink-500 text-sm">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search # or name…"
            className="bg-transparent outline-none text-sm flex-1 text-ink-100 placeholder:text-ink-600 min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-500 hover:text-ink-200 text-xs px-1">
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setIncompleteOnly((v) => !v)}
          className={`text-[11px] font-display font-bold uppercase tracking-wide px-3 py-2 rounded-lg transition whitespace-nowrap ${
            incompleteOnly ? 'bg-code-3 text-ink-950' : 'bg-ink-800 text-ink-400 hover:text-ink-100'
          }`}
        >
          Incomplete only ({incompleteCount})
        </button>
        {(search || incompleteOnly) && (
          <span className="text-[11px] text-ink-500 font-display tabular-nums whitespace-nowrap">
            {rows.length} of {allRows.length}
          </span>
        )}
        {editMode && <span className="text-xs text-ink-500">Tap a cell to edit — saves as you go.</span>}
      </div>

      {allRows.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-ink-400 text-lg font-display">No PICs this event yet.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-ink-500 font-display">No records match.</p>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-ink-500 border-b border-ink-800">
                {cols.map((key) =>
                  key === 'number' ? (
                    <th key={key} className="px-3 py-2 font-semibold whitespace-nowrap">
                      <button
                        onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                        className="inline-flex items-center gap-1 hover:text-ink-200 transition"
                        title={sortDir === 'asc' ? 'Ascending — click to flip' : 'Descending — click to flip'}
                      >
                        {label(key)}
                        <span className="text-xs leading-none">{sortDir === 'desc' ? '↓' : '↑'}</span>
                      </button>
                    </th>
                  ) : (
                    <th key={key} className="px-3 py-2 font-semibold whitespace-nowrap">
                      {label(key)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.pic.id}
                  onClick={editMode ? undefined : () => onPicClick?.(row.pic.id)}
                  className={`border-b border-ink-800/60 last:border-0 whitespace-nowrap ${
                    editMode ? '' : 'cursor-pointer hover:bg-ink-800/40'
                  }`}
                >
                  {cols.map((key) => {
                    const [content, highlight] = renderCell(key, row)
                    return (
                      <td key={key} className={`px-3 py-2 align-top ${highlight ? 'bg-code-3/15' : ''}`}>
                        {content}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!editMode && (
        <p className="text-xs text-ink-500 mt-2">Tap a row to open the record, or flip "Edit" on to fix gaps inline.</p>
      )}
    </div>
  )
}
