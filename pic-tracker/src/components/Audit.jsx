import { useEffect, useMemo, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import {
  currentCodeFor,
  getAssignedKpe,
  formatClock,
  changePicCode,
  changePicKpe,
  updatePicFields,
  updatePicEnteredCare,
  updatePicLeftCare,
  unassignedKpes,
} from '../lib/helpers'
import { completenessFor, isIncomplete } from '../lib/completeness'
import { CODES, SUBSTANCES, PRESENTATIONS, OUTCOMES } from '../constants/options'
import { Sel, Multi, Txt, inputCls } from './TableBoard'
import TimeDateEditor from './TimeDateEditor'

const CODE_COLOR = {
  1: 'bg-code-1',
  2: 'bg-code-2',
  3: 'bg-code-3',
  4: 'bg-code-4',
  5: 'bg-code-5',
}

// Small time-cell editor: click to open a TimeDateEditor in a popover,
// same underlying component used for admit/discharge time everywhere else.
function TimeCell({ value, onCommit, editable }) {
  const [open, setOpen] = useState(false)
  if (!editable) {
    return <span className="text-ink-600">—</span>
  }
  return (
    <span className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${inputCls} w-20 text-center tabular-nums`}
      >
        {formatClock(value)}
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 w-56 dropdown-panel bg-ink-900 border border-ink-700 rounded-lg shadow-2xl p-3">
          <TimeDateEditor
            value={value}
            mode="live"
            onCommit={(newIso) => onCommit(newIso)}
          />
          <button onClick={() => setOpen(false)} className="btn-primary w-full mt-1 text-sm">
            Done
          </button>
        </div>
      )}
    </span>
  )
}

// Audit — the completeness table from the old Reports page, now with Time
// In / Time Out columns and inline editing. Edit mode swaps row-click
// navigation for cell-level editing, same pattern as Table view.
export default function Audit({ refreshKey, onPicClick }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [search, setSearch] = useState('')
  const [incompleteOnly, setIncompleteOnly] = useState(false)
  const [editMode, setEditMode] = useState(false)

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
        if (a.incomplete !== b.incomplete) return a.incomplete ? -1 : 1
        return (a.pic.number || 0) - (b.pic.number || 0)
      })
  }, [pics])

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
  const inCareDash = <span className="text-ink-600">— in care —</span>

  const cell = (content, highlight) => (
    <td className={`px-3 py-2 align-top ${highlight ? 'bg-code-3/15' : ''}`}>{content}</td>
  )

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ audit</p>
          <h2 className="text-3xl font-display font-bold">
            {incompleteCount === 0
              ? 'All records complete'
              : `${incompleteCount} of ${allRows.length} incomplete`}
          </h2>
          <p className="text-sm text-ink-400 mt-1">Missing fields highlighted</p>
        </div>
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
        {editMode && (
          <span className="text-xs text-ink-500">Tap a cell to edit — saves as you go.</span>
        )}
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
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Name / desc</th>
                <th className="px-3 py-2 font-semibold">KPE</th>
                <th className="px-3 py-2 font-semibold">Time in</th>
                <th className="px-3 py-2 font-semibold">Time out</th>
                <th className="px-3 py-2 font-semibold">Substances</th>
                <th className="px-3 py-2 font-semibold">Presentations</th>
                <th className="px-3 py-2 font-semibold">Outcome</th>
                <th className="px-3 py-2 font-semibold">TL sign-off</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ pic, mf }) => {
                const code = currentCodeFor(pic.id, events)
                const kpe = getAssignedKpe(pic)
                const discharged = pic.status === 'discharged'
                const subs = [
                  ...(pic.substances || []).filter((s) => s !== 'Other'),
                  ...(pic.substances?.includes('Other') && pic.substanceOther ? [pic.substanceOther] : []),
                ]
                const pres = [
                  ...(pic.presentations || []).filter((s) => s !== 'Other'),
                  ...(pic.presentations?.includes('Other') && pic.presentationOther ? [pic.presentationOther] : []),
                ]
                const subPresMissing = mf.has('substancesOrPresentations')

                return (
                  <tr
                    key={pic.id}
                    onClick={editMode ? undefined : () => onPicClick?.(pic.id)}
                    className={`border-b border-ink-800/60 last:border-0 whitespace-nowrap ${
                      editMode ? '' : 'cursor-pointer hover:bg-ink-800/40'
                    }`}
                  >
                    {cell(<span className="tabular-nums font-display font-semibold">#{pic.number}</span>)}

                    {cell(
                      editMode ? (
                        <Sel
                          value={code ?? ''}
                          width="w-16"
                          options={CODES.map((c) => ({ value: c.code, label: c.code }))}
                          onChange={(v) => save(() => changePicCode(pic.id, Number(v), kpe || null))}
                        />
                      ) : code != null ? (
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-display font-black text-white ${
                            CODE_COLOR[code] || 'bg-ink-600'
                          }`}
                        >
                          {code}
                        </span>
                      ) : (
                        '—'
                      ),
                    )}

                    {cell(
                      editMode ? (
                        <Txt
                          value={pic.name || pic.description || ''}
                          placeholder="name / desc"
                          onSave={(v) => save(() => updatePicFields(pic.id, pic.name ? { name: v || null } : { description: v || null }))}
                        />
                      ) : mf.has('identifier') ? (
                        miss
                      ) : (
                        pic.name?.trim() || pic.description?.trim() || '—'
                      ),
                      mf.has('identifier'),
                    )}

                    {cell(
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
                    )}

                    {cell(
                      <TimeCell
                        value={pic.enteredCare}
                        editable
                        onCommit={(newIso) => save(() => updatePicEnteredCare(pic.id, newIso))}
                      />,
                    )}

                    {cell(
                      discharged ? (
                        <TimeCell
                          value={pic.leftCare}
                          editable
                          onCommit={(newIso) => save(() => updatePicLeftCare(pic.id, newIso))}
                        />
                      ) : (
                        inCareDash
                      ),
                    )}

                    {cell(
                      editMode ? (
                        <Multi
                          selected={subs}
                          options={SUBSTANCES}
                          onChange={(arr) => save(() => updatePicFields(pic.id, { substances: arr }))}
                        />
                      ) : subPresMissing ? (
                        miss
                      ) : (
                        subs.join(', ') || '—'
                      ),
                      subPresMissing,
                    )}

                    {cell(
                      editMode ? (
                        <Multi
                          selected={pres}
                          options={PRESENTATIONS}
                          onChange={(arr) => save(() => updatePicFields(pic.id, { presentations: arr }))}
                        />
                      ) : subPresMissing ? (
                        miss
                      ) : (
                        pres.join(', ') || '—'
                      ),
                      subPresMissing,
                    )}

                    {cell(
                      !discharged ? (
                        inCareDash
                      ) : editMode ? (
                        <Sel
                          value={pic.outcome || ''}
                          options={OUTCOMES}
                          onChange={(v) => save(() => updatePicFields(pic.id, { outcome: v || null }))}
                        />
                      ) : mf.has('outcome') ? (
                        miss
                      ) : (
                        pic.outcome || '—'
                      ),
                      discharged && mf.has('outcome'),
                    )}

                    {cell(
                      !discharged ? (
                        inCareDash
                      ) : editMode ? (
                        <Sel
                          value={pic.tlSignoff || ''}
                          options={eventCfg?.tls || []}
                          onChange={(v) => save(() => updatePicFields(pic.id, { tlSignoff: v || null }))}
                        />
                      ) : mf.has('tlSignoff') ? (
                        miss
                      ) : (
                        pic.tlSignoff || '—'
                      ),
                      discharged && mf.has('tlSignoff'),
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {!editMode && <p className="text-xs text-ink-500 mt-2">Tap a row to open the record, or flip "Edit" on to fix gaps inline.</p>}
    </div>
  )
}
