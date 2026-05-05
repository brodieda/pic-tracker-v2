import { useEffect, useMemo, useState } from 'react'
import {
  getPics,
  getEvents,
  getEvent,
} from '../lib/store'
import {
  formatClock,
  formatElapsed,
  elapsedMinutes,
  currentCodeFor,
  highestCodeFor,
  shiftFor,
  isoToDatetimeLocal,
  datetimeLocalToIso,
  updatePicFields,
  changePicCode,
  changePicKpe,
  addPicNote,
  updatePicEnteredCare,
  getAssignedKpe,
} from '../lib/helpers'
import {
  CODES,
  REFERRED_BY,
  SUBSTANCES,
  PRESENTATIONS,
  GENDERS,
  AGE_RANGES,
} from '../constants/options'
import CodeBadge from './CodeBadge'
import ChipGroup from './ChipGroup'
import EditableCell from './EditableCell'
import EventLog from './EventLog'
import Code1Warning from './Code1Warning'

export default function PicDetailPanel({ picId, onClose, onMutated }) {
  // Local snapshot — re-pulled from store after every mutation
  const [pic, setPic] = useState(null)
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [code1Pending, setCode1Pending] = useState(null) // null or the candidate code
  const [noteDraft, setNoteDraft] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)

  const reload = () => {
    const all = getPics()
    setPic(all.find((p) => p.id === picId) || null)
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    if (picId) reload()
  }, [picId])

  // ESC to close
  useEffect(() => {
    if (!picId) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [picId, onClose])

  // Tab title
  useEffect(() => {
    if (pic) {
      const old = document.title
      document.title = `PIC #${pic.number} — PIC tracker`
      return () => {
        document.title = old
      }
    }
  }, [pic])

  const allKpes = useMemo(
    () => Array.from(new Set([...(eventCfg.shift1Team || []), ...(eventCfg.shift2Team || [])])),
    [eventCfg],
  )

  if (!picId) return null
  if (!pic) {
    return (
      <PanelShell onClose={onClose}>
        <div className="p-8 text-ink-400">PIC not found.</div>
      </PanelShell>
    )
  }

  const code = currentCodeFor(pic.id, events)
  const highest = highestCodeFor(pic.id, events)
  const elapsed = elapsedMinutes(pic.enteredCare, pic.leftCare)
  const assignedKpe = getAssignedKpe(pic)
  const shift = shiftFor(assignedKpe, eventCfg)
  const shiftClass = shift === 1 ? 'bg-shift-1' : shift === 2 ? 'bg-shift-2' : 'bg-ink-700'
  const isDischarged = pic.status === 'discharged'

  const afterMutation = () => {
    reload()
    onMutated?.()
  }

  // ---- Mutations ----

  const onCodeTap = (newCode) => {
    if (newCode === code) return
    if (newCode === 1) {
      setCode1Pending(newCode)
      return
    }
    changePicCode(pic.id, newCode, assignedKpe)
    afterMutation()
  }

  const acknowledgeCode1 = () => {
    if (code1Pending != null) {
      changePicCode(pic.id, code1Pending, assignedKpe)
      setCode1Pending(null)
      afterMutation()
    }
  }

  const onKpeChange = (newKpe) => {
    if (newKpe === assignedKpe) return
    changePicKpe(pic.id, newKpe || null, assignedKpe || null)
    afterMutation()
  }

  const submitNote = () => {
    if (!noteDraft.trim()) return
    addPicNote(pic.id, noteDraft.trim(), assignedKpe)
    setNoteDraft('')
    setNoteOpen(false)
    afterMutation()
  }

  // ---- Display ----

  return (
    <PanelShell onClose={onClose}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-ink-800">
        <div className="flex items-start gap-4">
          <CodeBadge code={code} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display font-black text-2xl tabular-nums">
                #{pic.number}
              </span>
              <h2 className={`font-display font-bold text-2xl truncate ${!pic.name ? 'text-ink-400 italic font-medium' : ''}`}>
                {pic.name || pic.description || '— no name —'}
              </h2>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-ink-400 flex-wrap">
              <span className="font-display tabular-nums">
                In since {formatClock(pic.enteredCare)} · {formatElapsed(elapsed)}
              </span>
              {highest != null && highest !== code && (
                <span>
                  Peak: <span className="font-display font-bold">Code {highest}</span>
                </span>
              )}
              {isDischarged && (
                <span className="px-2 py-0.5 rounded-full bg-ink-800 border border-ink-700 text-ink-300 uppercase tracking-widest text-[10px] font-display font-bold">
                  Discharged
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost px-3" aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Code change buttons — primary action */}
        <section>
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
            Update code
          </div>
          <div className="flex items-stretch gap-2">
            {/* Code 1 - small, set apart */}
            {(() => {
              const c = CODES[0]
              const active = code === 1
              return (
                <button
                  key={1}
                  type="button"
                  onClick={() => onCodeTap(1)}
                  className={`relative h-14 w-14 rounded-xl font-display font-bold ${c.tw} text-white transition border-2 flex flex-col items-center justify-center shrink-0 ${
                    active ? 'border-white shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  title="Code 1 — Emergency"
                >
                  <span className="text-xs">⚠</span>
                  <span className="leading-none text-base">1</span>
                </button>
              )
            })()}
            <div className="w-px bg-ink-800 mx-1" />
            {CODES.slice(1).map((c) => {
              const active = code === c.code
              const tone = c.code === 3 ? 'text-ink-950' : 'text-white'
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onCodeTap(c.code)}
                  className={`relative flex-1 h-16 rounded-xl font-display font-bold text-xl ${c.tw} ${tone} transition border-2 ${
                    active ? 'border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {c.code}
                  {c.desc && (
                    <span className="absolute bottom-0.5 left-0 right-0 text-[9px] uppercase tracking-widest font-semibold opacity-80">
                      {c.desc}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Assigned KPE pill — clickable to change */}
        <EditableCell
          label="Assigned KPE"
          displayChildren={
            <div className="flex items-center gap-2 flex-wrap">
              {assignedKpe ? (
                <span className={`inline-flex items-center gap-1.5 ${shiftClass} text-white text-sm font-semibold px-3 py-1 rounded-full`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  {assignedKpe}
                </span>
              ) : (
                <span className="text-ink-500 italic text-sm">Unassigned — tap to assign</span>
              )}
            </div>
          }
          renderEditor={({ done }) => (
            <div className="flex gap-2">
              <input
                className="input"
                list="kpe-list-detail"
                defaultValue={assignedKpe || ''}
                placeholder="Type a KPE name…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onKpeChange(e.currentTarget.value.trim())
                    done()
                  }
                  if (e.key === 'Escape') done()
                }}
                onBlur={(e) => {
                  onKpeChange(e.currentTarget.value.trim())
                }}
              />
              <datalist id="kpe-list-detail">
                {allKpes.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <button
                className="btn-ghost"
                onClick={() => {
                  onKpeChange(null)
                  done()
                }}
              >
                Clear
              </button>
            </div>
          )}
        />

        {/* 2x2 grid of editable details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EditableCell
            label="Substances"
            displayChildren={<ChipDisplay values={pic.substances} other={pic.substanceOther} />}
            renderEditor={() => (
              <ChipEditor
                options={SUBSTANCES}
                value={pic.substances || []}
                otherValue={pic.substanceOther || ''}
                multi
                onCommit={(value, otherValue) =>
                  updatePicAndReload({ substances: value, substanceOther: otherValue })
                }
              />
            )}
          />
          <EditableCell
            label="Presentations"
            displayChildren={<ChipDisplay values={pic.presentations} other={pic.presentationOther} />}
            renderEditor={() => (
              <ChipEditor
                options={PRESENTATIONS}
                value={pic.presentations || []}
                otherValue={pic.presentationOther || ''}
                multi
                onCommit={(value, otherValue) =>
                  updatePicAndReload({ presentations: value, presentationOther: otherValue })
                }
              />
            )}
          />
          <EditableCell
            label="Referred by"
            displayChildren={
              pic.referredBy ? (
                <span className="text-sm text-ink-200">
                  {pic.referredBy === 'Other' ? pic.referredByOther || 'Other' : pic.referredBy}
                </span>
              ) : (
                <span className="text-ink-500 italic text-sm">Not set</span>
              )
            }
            renderEditor={() => (
              <ChipEditor
                options={REFERRED_BY}
                value={pic.referredBy || null}
                otherValue={pic.referredByOther || ''}
                onCommit={(value, otherValue) =>
                  updatePicAndReload({ referredBy: value, referredByOther: otherValue })
                }
              />
            )}
          />
          <EditableCell
            label="Gender / age"
            displayChildren={
              pic.gender || pic.ageRange ? (
                <span className="text-sm text-ink-200">
                  {pic.gender || '—'}
                  {pic.ageRange ? ` · ${pic.ageRange}` : ''}
                </span>
              ) : (
                <span className="text-ink-500 italic text-sm">Not set</span>
              )
            }
            renderEditor={() => (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">Gender</div>
                  <ChipEditor
                    options={GENDERS}
                    value={pic.gender}
                    onCommit={(value) => updatePicAndReload({ gender: value })}
                  />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">Age range</div>
                  <ChipEditor
                    options={AGE_RANGES}
                    value={pic.ageRange}
                    onCommit={(value) => updatePicAndReload({ ageRange: value })}
                  />
                </div>
              </div>
            )}
          />
        </div>

        {/* Description */}
        <EditableCell
          label="Description"
          displayChildren={
            pic.description ? (
              <span className="text-sm text-ink-200">{pic.description}</span>
            ) : (
              <span className="text-ink-500 italic text-sm">No description</span>
            )
          }
          renderEditor={({ done }) => (
            <input
              className="input"
              defaultValue={pic.description || ''}
              autoFocus
              placeholder="Distinguishing features, clothing, etc."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updatePicAndReload({ description: e.currentTarget.value.trim() || null })
                  done()
                }
                if (e.key === 'Escape') done()
              }}
              onBlur={(e) =>
                updatePicAndReload({ description: e.currentTarget.value.trim() || null })
              }
            />
          )}
        />

        {/* Name (rare edit but possible) */}
        <EditableCell
          label="Name"
          displayChildren={
            pic.name ? (
              <span className="text-sm text-ink-200">{pic.name}</span>
            ) : (
              <span className="text-ink-500 italic text-sm">No name — # is identifier</span>
            )
          }
          renderEditor={({ done }) => (
            <input
              className="input"
              defaultValue={pic.name || ''}
              autoFocus
              placeholder="Name or descriptor"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updatePicAndReload({ name: e.currentTarget.value.trim() || null })
                  done()
                }
                if (e.key === 'Escape') done()
              }}
              onBlur={(e) =>
                updatePicAndReload({ name: e.currentTarget.value.trim() || null })
              }
            />
          )}
        />

        {/* Time in */}
        <EditableCell
          label="Time in"
          displayChildren={
            <span className="text-sm font-display tabular-nums text-ink-200">
              {formatClock(pic.enteredCare)}
              <span className="text-ink-500 ml-2 text-xs">({formatElapsed(elapsed)} ago)</span>
            </span>
          }
          renderEditor={({ done }) => (
            <input
              className="input"
              type="datetime-local"
              defaultValue={isoToDatetimeLocal(pic.enteredCare)}
              autoFocus
              onBlur={(e) => {
                const newIso = datetimeLocalToIso(e.currentTarget.value)
                if (newIso) updatePicEnteredCare(pic.id, newIso)
                afterMutation()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const newIso = datetimeLocalToIso(e.currentTarget.value)
                  if (newIso) updatePicEnteredCare(pic.id, newIso)
                  afterMutation()
                  done()
                }
                if (e.key === 'Escape') done()
              }}
            />
          )}
        />

        {/* Note */}
        <section className="panel p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500">
              Add note
            </span>
            {!noteOpen && (
              <button
                onClick={() => setNoteOpen(true)}
                className="text-xs text-ink-300 hover:text-ink-100 font-display tracking-wide"
              >
                + Add a note
              </button>
            )}
          </div>
          {noteOpen && (
            <div className="space-y-2">
              <textarea
                className="input min-h-[5rem]"
                placeholder="Observations, status update, etc."
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setNoteOpen(false)
                    setNoteDraft('')
                  }}
                >
                  Cancel
                </button>
                <button className="btn-primary" onClick={submitNote} disabled={!noteDraft.trim()}>
                  Save note
                </button>
              </div>
            </div>
          )}
        </section>

        {/* History toggle */}
        <section className="panel p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
              Event history · {events.filter((e) => e.picId === pic.id).length} entries
            </span>
            <span
              className={`text-ink-400 transition ${showHistory ? 'rotate-90' : ''}`}
            >
              ›
            </span>
          </button>
          {showHistory && (
            <div className="mt-4 pt-4 border-t border-ink-800">
              <EventLog events={events} picId={pic.id} />
            </div>
          )}
        </section>

        {/* Discharge button (Pass 2 will wire this) */}
        {!isDischarged && (
          <div className="pt-2">
            <button className="btn-ghost w-full" disabled title="Coming in Pass 2">
              Discharge PIC #{pic.number} (Pass 2)
            </button>
          </div>
        )}
      </div>

      <Code1Warning
        open={code1Pending != null}
        onCancel={() => setCode1Pending(null)}
        onContinue={acknowledgeCode1}
      />
    </PanelShell>
  )

  // helper closure inside component
  function updatePicAndReload(patch) {
    updatePicFields(pic.id, patch)
    afterMutation()
  }
}

// ---------- Subcomponents ----------

function ChipDisplay({ values, other }) {
  const displayList = [
    ...(values || []).filter((s) => s !== 'Other'),
    ...((values || []).includes('Other') && other ? [other] : []),
  ]
  if (displayList.length === 0) {
    return <span className="text-ink-500 italic text-sm">None set</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {displayList.map((s, i) => (
        <span
          key={`${s}-${i}`}
          className="text-xs bg-ink-800 border border-ink-700 rounded-md px-2 py-0.5 text-ink-200"
        >
          {s}
        </span>
      ))}
    </div>
  )
}

function ChipEditor({ options, value, otherValue, onCommit, multi = false }) {
  const [v, setV] = useState(value)
  const [o, setO] = useState(otherValue || '')

  const isOn = (opt) => (multi ? v?.includes(opt) : v === opt)
  const toggle = (opt) => {
    if (multi) {
      const next = isOn(opt) ? v.filter((x) => x !== opt) : [...(v || []), opt]
      setV(next)
      onCommit(next, o)
    } else {
      const next = isOn(opt) ? null : opt
      setV(next)
      onCommit(next, o)
    }
  }

  const otherSelected = multi ? v?.includes('Other') : v === 'Other'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={isOn(opt) ? 'chip-on' : 'chip-off'}
          >
            {opt}
          </button>
        ))}
      </div>
      {otherSelected && (
        <input
          type="text"
          className="input"
          placeholder="Specify…"
          value={o}
          onChange={(e) => {
            setO(e.target.value)
            onCommit(v, e.target.value)
          }}
        />
      )}
    </div>
  )
}

// ---------- Panel shell with backdrop, slide-in animation, responsive width ----------

function PanelShell({ children, onClose }) {
  return (
    <>
      {/* Backdrop — only visible on narrow viewports (< lg breakpoint) */}
      <div
        className="fixed inset-0 z-40 bg-black/60 lg:bg-transparent lg:pointer-events-none"
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-40 bg-ink-950 border-l border-ink-800 shadow-2xl flex flex-col w-full lg:w-[560px] animate-slide-in"
        style={{ animation: 'slideIn 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        {children}
      </aside>
    </>
  )
}
