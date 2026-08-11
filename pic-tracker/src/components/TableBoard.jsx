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
  updatePicFields,
  changePicCode,
  changePicKpe,
  unassignedKpes,
} from '../lib/helpers'
import { completenessFor } from '../lib/completeness'
import {
  CODES,
  GENDERS,
  AGE_RANGES,
  REFERRED_BY,
  REFERRED_TO,
  OUTCOMES,
  SUBSTANCES,
  PRESENTATIONS,
} from '../constants/options'
import { columnsFor, getVisibleColumns, setVisibleColumns } from '../lib/tableColumns'
import ShieldIcon from './ShieldIcon'

export const abbrevGender = (g) =>
  g === 'Feminine' ? 'F' : g === 'Masculine' ? 'M' : g === 'Non-binary' ? 'NB' : g || ''
export const gaLabel = (p) =>
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

// --- small edit controls ---
export const inputCls =
  'bg-ink-950 border border-ink-700 rounded px-2 py-1 text-sm text-ink-100 focus:border-ink-400 outline-none'

export function Txt({ value, placeholder, onSave, width = 'w-32' }) {
  return (
    <input
      className={`${inputCls} ${width}`}
      defaultValue={value || ''}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        const v = e.target.value.trim()
        if ((value || '') !== v) onSave(v)
      }}
    />
  )
}

export function Sel({ value, options, onChange, placeholder = '—', width = 'w-28' }) {
  return (
    <select
      className={`${inputCls} ${width}`}
      value={value ?? ''}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  )
}

export function Multi({ selected, options, onChange }) {
  const [open, setOpen] = useState(false)
  const sel = selected || []
  const toggle = (o) => onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o])
  return (
    <span className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`${inputCls} w-32 text-left truncate`}
      >
        {sel.length ? sel.join(', ') : <span className="text-ink-500">add…</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute left-0 top-8 z-20 w-44 max-h-60 overflow-y-auto bg-ink-900 border border-ink-700 rounded-lg shadow-2xl p-1.5">
            {options.map((o) => (
              <button
                key={o}
                onClick={(e) => { e.stopPropagation(); toggle(o) }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-ink-800 text-left"
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] shrink-0 ${sel.includes(o) ? 'bg-ink-100 border-ink-100 text-ink-950' : 'border-ink-600 text-transparent'}`}>✓</span>
                <span className="text-ink-200">{o}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  )
}

export function ColumnsButton({ tableKey, visible, onChange }) {
  const [open, setOpen] = useState(false)
  const defs = columnsFor(tableKey)
  const def = (k) => defs.find((c) => c.key === k)
  const hidden = defs.filter((c) => !visible.includes(c.key))

  const remove = (key) => onChange(visible.filter((k) => k !== key))
  const add = (key) => onChange([...visible, key])
  const move = (key, dir) => {
    const i = visible.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= visible.length) return
    const next = [...visible]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
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
          <div className="absolute right-0 top-9 z-20 w-60 bg-ink-900 border border-ink-700 rounded-xl shadow-2xl p-2">
            <div className="text-[10px] tracking-[0.16em] uppercase text-ink-500 px-2 pb-1.5">Shown — drag order with arrows</div>
            {visible.map((key, i) => {
              const c = def(key)
              if (!c) return null
              return (
                <div key={key} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-ink-800">
                  <button
                    disabled={c.locked}
                    onClick={() => remove(key)}
                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${c.locked ? 'bg-ink-700 border-ink-700 text-ink-500' : 'bg-ink-100 border-ink-100 text-ink-950'}`}
                    title={c.locked ? 'Locked on' : 'Hide'}
                  >
                    ✓
                  </button>
                  <span className="text-ink-200 text-sm flex-1 truncate">{c.label}</span>
                  <button onClick={() => move(key, -1)} disabled={i === 0} className="text-ink-500 hover:text-ink-100 disabled:opacity-30 px-1">↑</button>
                  <button onClick={() => move(key, 1)} disabled={i === visible.length - 1} className="text-ink-500 hover:text-ink-100 disabled:opacity-30 px-1">↓</button>
                </div>
              )
            })}
            {hidden.length > 0 && (
              <>
                <div className="text-[10px] tracking-[0.16em] uppercase text-ink-500 px-2 pt-2 pb-1 border-t border-ink-800 mt-1.5">Hidden</div>
                {hidden.map((c) => (
                  <button key={c.key} onClick={() => add(c.key)} className="w-full flex items-center gap-2.5 px-2 py-1 rounded-md hover:bg-ink-800 text-left">
                    <span className="w-4 h-4 rounded border border-ink-600 shrink-0" />
                    <span className="text-ink-400 text-sm">{c.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function TableBoard({ pics, events, eventCfg, onPicClick, onEdited }) {
  const [inCareCols, setInCareCols] = useState(() => getVisibleColumns('incare'))
  const [dischCols, setDischCols] = useState(() => getVisibleColumns('discharged'))
  const [editMode, setEditMode] = useState(false)

  const setInCare = (keys) => { setVisibleColumns('incare', keys); setInCareCols(keys) }
  const setDisch = (keys) => { setVisibleColumns('discharged', keys); setDischCols(keys) }

  const now = Date.now()
  const kpeOptions = useMemo(() => {
    const base = [...(eventCfg?.shift1Team || []), ...(eventCfg?.shift2Team || []), ...unassignedKpes(pics, eventCfg)]
    return Array.from(new Set(base))
  }, [pics, eventCfg])

  const save = (fn) => { fn(); onEdited?.() }

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

  // ---- read-mode cells ----
  const inCareRead = (key, row) => {
    const { pic, code, overdue, kpe, shiftClass, elapsed, missing } = row
    switch (key) {
      case 'number': return <span className="font-display font-black tabular-nums">{pic.number}</span>
      case 'code': return <CodeSquare code={code} />
      case 'name':
        return pic.name?.trim() ? <span className="font-semibold text-ink-100">{pic.name}</span>
          : missing.has('identifier') ? missTag : <span className="text-ink-500 italic">no name</span>
      case 'description': return pic.description?.trim() ? <span className="text-ink-300">{pic.description}</span> : dash
      case 'ga': return gaLabel(pic) || dash
      case 'kpe':
        return kpe ? <span className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${shiftClass}`} />{kpe}</span>
          : missing.has('assignedKpe') ? missTag : dash
      case 'refBy': { const v = normalizeReferredBy(pic); return v.length ? v.join(', ') : dash }
      case 'substances':
        return pic.substances?.length ? pic.substances.join(', ')
          : missing.has('substancesOrPresentations') ? missTag : dash
      case 'presentations': return pic.presentations?.length ? pic.presentations.join(', ') : dash
      case 'time': return <span className={`tabular-nums font-semibold ${overdue ? 'text-code-1' : 'text-ink-300'}`}>{formatElapsed(elapsed)}</span>
      case 'flags':
        return (
          <span className="inline-flex items-center gap-1.5">
            {wasEverCode2(pic.id, events) && <span className="text-code-2" title="Has been Code 2">⚑</span>}
            {pic.ejectionFlag && <span className="secflag-on inline-flex items-center rounded px-1 py-0.5" title="Security flag"><ShieldIcon className="w-3 h-3" /></span>}
          </span>
        )
      default: return null
    }
  }

  // ---- edit-mode cells (in-care) ----
  const inCareEdit = (key, row) => {
    const { pic, code, kpe } = row
    switch (key) {
      case 'number': return <span className="font-display font-black tabular-nums">{pic.number}</span>
      case 'code':
        return <Sel value={code} width="w-16" placeholder="–" options={CODES.map((c) => ({ value: c.code, label: String(c.code) }))}
          onChange={(v) => save(() => changePicCode(pic.id, Number(v), kpe || null))} />
      case 'name': return <Txt value={pic.name} placeholder="name" onSave={(v) => save(() => updatePicFields(pic.id, { name: v || null }))} />
      case 'description': return <Txt value={pic.description} placeholder="description" onSave={(v) => save(() => updatePicFields(pic.id, { description: v || null }))} />
      case 'ga':
        return (
          <span className="inline-flex gap-1">
            <Sel value={pic.gender} width="w-16" placeholder="G" options={GENDERS.map((g) => ({ value: g, label: abbrevGender(g) }))} onChange={(v) => save(() => updatePicFields(pic.id, { gender: v || null }))} />
            <Sel value={pic.ageRange} width="w-20" placeholder="age" options={AGE_RANGES} onChange={(v) => save(() => updatePicFields(pic.id, { ageRange: v || null }))} />
          </span>
        )
      case 'kpe':
        return <Sel value={kpe} placeholder="unassigned" options={kpeOptions} onChange={(v) => save(() => changePicKpe(pic.id, v || null, null))} />
      case 'refBy':
        return <Sel value={normalizeReferredBy(pic)[0]} placeholder="–" options={REFERRED_BY} onChange={(v) => save(() => updatePicFields(pic.id, { referredBy: v || null }))} />
      case 'substances':
        return <Multi selected={pic.substances} options={SUBSTANCES} onChange={(arr) => save(() => updatePicFields(pic.id, { substances: arr }))} />
      case 'presentations':
        return <Multi selected={pic.presentations} options={PRESENTATIONS} onChange={(arr) => save(() => updatePicFields(pic.id, { presentations: arr }))} />
      case 'time': return inCareRead('time', row)
      case 'flags':
        return (
          <button onClick={(e) => { e.stopPropagation(); save(() => updatePicFields(pic.id, { ejectionFlag: !pic.ejectionFlag })) }}
            className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${pic.ejectionFlag ? 'secflag-on' : 'border-ink-700 text-ink-500'}`}>
            SEC
          </button>
        )
      default: return null
    }
  }

  const dischRead = (key, row) => {
    const { pic, duration, kpe } = row
    switch (key) {
      case 'number': return <span className="font-display font-black tabular-nums">{pic.number}</span>
      case 'name': return pic.name?.trim() ? <span className="font-semibold text-ink-100">{pic.name}</span> : <span className="text-ink-500 italic">{pic.description?.trim() || 'no name'}</span>
      case 'ga': return gaLabel(pic) || dash
      case 'timeOut': return <span className="tabular-nums text-ink-300">{formatClock(pic.leftCare)}</span>
      case 'duration': return <span className="tabular-nums text-ink-300">{formatElapsed(duration)}</span>
      case 'outcome': { const o = pic.outcome === 'Other' ? pic.outcomeOther : pic.outcome; return o ? <span className="tag">{o}</span> : dash }
      case 'kpe': return kpe || dash
      case 'medical': return pic.medicalInvolved === true ? <span className="text-code-1 font-bold" title="Medical involved">⚕</span> : dash
      case 'refTo': { const v = normalizeReferredTo(pic); return v.length ? v.join(', ') : dash }
      case 'secNotified':
        if (!pic.ejectionFlag) return dash
        return pic.securityNotified === true ? <span className="text-code-5 font-semibold">Yes</span>
          : pic.securityNotified === false ? <span className="text-code-1 font-semibold">No</span> : <span className="text-ink-500">n/a</span>
      case 'tlSignoff': return pic.tlSignoff || dash
      default: return null
    }
  }

  const dischEdit = (key, row) => {
    const { pic } = row
    switch (key) {
      case 'name': return <Txt value={pic.name} placeholder="name" onSave={(v) => save(() => updatePicFields(pic.id, { name: v || null }))} />
      case 'ga':
        return (
          <span className="inline-flex gap-1">
            <Sel value={pic.gender} width="w-16" placeholder="G" options={GENDERS.map((g) => ({ value: g, label: abbrevGender(g) }))} onChange={(v) => save(() => updatePicFields(pic.id, { gender: v || null }))} />
            <Sel value={pic.ageRange} width="w-20" placeholder="age" options={AGE_RANGES} onChange={(v) => save(() => updatePicFields(pic.id, { ageRange: v || null }))} />
          </span>
        )
      case 'outcome': return <Sel value={pic.outcome} placeholder="–" options={OUTCOMES} onChange={(v) => save(() => updatePicFields(pic.id, { outcome: v || null }))} />
      case 'kpe': return <Sel value={pic.lastKpe} placeholder="–" options={kpeOptions} onChange={(v) => save(() => updatePicFields(pic.id, { lastKpe: v || null }))} />
      case 'medical': return <Sel value={pic.medicalInvolved === true ? 'Yes' : pic.medicalInvolved === false ? 'No' : ''} width="w-20" placeholder="–" options={['Yes', 'No']} onChange={(v) => save(() => updatePicFields(pic.id, { medicalInvolved: v === 'Yes' ? true : v === 'No' ? false : null }))} />
      case 'refTo': return <Sel value={normalizeReferredTo(pic)[0]} placeholder="–" options={REFERRED_TO} onChange={(v) => save(() => updatePicFields(pic.id, { referredTo: v || null }))} />
      case 'secNotified':
        if (!pic.ejectionFlag) return dash
        return <Sel value={pic.securityNotified === true ? 'Yes' : pic.securityNotified === false ? 'No' : ''} width="w-20" placeholder="–" options={['Yes', 'No']} onChange={(v) => save(() => updatePicFields(pic.id, { securityNotified: v === 'Yes' ? true : v === 'No' ? false : null }))} />
      case 'tlSignoff': return <Sel value={pic.tlSignoff} placeholder="–" options={eventCfg?.tls || []} onChange={(v) => save(() => updatePicFields(pic.id, { tlSignoff: v || null }))} />
      default: return dischRead(key, row)
    }
  }

  const inCareVisible = inCareCols.map((k) => columnsFor('incare').find((c) => c.key === k)).filter(Boolean)
  const dischVisible = dischCols.map((k) => columnsFor('discharged').find((c) => c.key === k)).filter(Boolean)

  const Table = ({ cols, rows, read, edit, rowClass, emptyText }) => (
    <div className="overflow-x-auto rounded-xl border border-ink-800">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-ink-900">
            {cols.map((c) => (
              <th key={c.key} className="text-left text-[10px] tracking-[0.08em] uppercase text-ink-500 font-display font-bold px-3 py-2.5 border-b border-ink-800 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-ink-500">{emptyText}</td></tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.pic.id}
                onClick={editMode ? undefined : () => onPicClick?.(row.pic)}
                className={`transition ${editMode ? '' : 'cursor-pointer hover:bg-ink-800/40'} ${rowClass ? rowClass(row) : ''}`}
              >
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-2 border-b border-ink-800/60 whitespace-nowrap">
                    {editMode ? edit(c.key, row) : read(c.key, row)}
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`inline-flex items-center gap-2 text-xs font-display font-bold rounded-lg px-3 py-1.5 border transition ${editMode ? 'bg-shift-1 text-white border-white' : 'bg-ink-800 border-ink-700 text-ink-300 hover:border-ink-500'}`}
        >
          <span className={`w-8 h-4 rounded-full relative transition ${editMode ? 'bg-white/40' : 'bg-ink-600'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${editMode ? 'left-4' : 'left-0.5'}`} />
          </span>
          Edit {editMode ? 'on' : 'off'}
        </button>
        {editMode && <span className="text-xs text-ink-500">Tap a cell to edit — saves as you go. Code &amp; KPE changes log to the trail.</span>}
      </div>

      <section>
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="w-2 h-2 rounded-full bg-code-5" />
          <h3 className="font-display font-bold text-sm tracking-wide uppercase">In care · {inCareRows.length}</h3>
          <div className="ml-auto"><ColumnsButton tableKey="incare" visible={inCareCols} onChange={setInCare} /></div>
        </div>
        <Table cols={inCareVisible} rows={inCareRows} read={inCareRead} edit={inCareEdit} rowClass={(r) => (r.overdue ? 'bg-code-1/5' : '')} emptyText="No one is currently in care." />
      </section>

      <section>
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="w-2 h-2 rounded-full bg-ink-500" />
          <h3 className="font-display font-bold text-sm tracking-wide uppercase text-ink-400">Discharged · {dischRows.length}</h3>
          <div className="ml-auto"><ColumnsButton tableKey="discharged" visible={dischCols} onChange={setDisch} /></div>
        </div>
        <Table cols={dischVisible} rows={dischRows} read={dischRead} edit={dischEdit} emptyText="No discharged PICs yet." />
      </section>
    </div>
  )
}
