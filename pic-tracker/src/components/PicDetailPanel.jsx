import { useEffect, useState } from 'react'
import { getPics, getEvents, getEvent } from '../lib/store'
import {
  formatClock,
  formatDateTime,
  formatElapsed,
  elapsedMinutes,
  currentCodeFor,
  highestCodeFor,
  shiftFor,
  updatePicFields,
  changePicCode,
  changePicKpe,
  addPicNote,
  updatePicEnteredCare,
  addCheckEvent,
  reopenPic,
  getAssignedKpe,
  normalizeReferredBy,
  normalizeReferredTo,
  code3MonitorStateFor,
  minutesSinceLastActivity,
  latestEventFor,
} from '../lib/helpers'
import {
  CODES,
  REFERRED_BY,
  REFERRED_TO,
  SUBSTANCES,
  PRESENTATIONS,
  GENDERS,
  AGE_RANGES,
  OUTCOMES,
} from '../constants/options'
import CodeBadge from './CodeBadge'
import EditableCell from './EditableCell'
import EventLog, { EventLogItem } from './EventLog'
import Code1Warning from './Code1Warning'
import KpeChipPicker from './KpeChipPicker'
import TimeDateEditor from './TimeDateEditor'
import DischargeModal from './DischargeModal'

export default function PicDetailPanel({ picId, onClose, onMutated }) {
  const [pic, setPic] = useState(null)
  const [events, setEvents] = useState([])
  const [eventCfg, setEventCfg] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [code1Pending, setCode1Pending] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [editingKpe, setEditingKpe] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingTime, setEditingTime] = useState(false)
  const [dischargeOpen, setDischargeOpen] = useState(false)
  const [tick, setTick] = useState(0)

  const reload = () => {
    const all = getPics()
    setPic(all.find((p) => p.id === picId) || null)
    setEvents(getEvents())
    setEventCfg(getEvent())
  }

  useEffect(() => {
    if (picId) reload()
  }, [picId])

  // Tick to keep monitoring footer fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // ESC closes
  useEffect(() => {
    if (!picId) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (dischargeOpen) return
        onClose?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [picId, onClose, dischargeOpen])

  useEffect(() => {
    if (pic) {
      const old = document.title
      document.title = `PIC #${pic.number} — PIC tracker`
      return () => {
        document.title = old
      }
    }
  }, [pic])

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
  const referredByList = normalizeReferredBy(pic)
  const referredToList = normalizeReferredTo(pic)
  const monitorState = !isDischarged ? code3MonitorStateFor(pic.id, events, eventCfg) : null
  const minsSince = !isDischarged ? minutesSinceLastActivity(pic.id, events) : null
  const latestEvent = latestEventFor(pic.id, events)
  const eventCount = events.filter((e) => e.picId === pic.id).length

  const afterMutation = () => {
    reload()
    onMutated?.()
  }

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
    setShowHistory(true)
    afterMutation()
  }

  const onMarkChecked = () => {
    addCheckEvent(pic.id, assignedKpe, null)
    afterMutation()
  }

  const onReopen = () => {
    if (!confirm(`Reopen PIC #${pic.number} and move back to in-care?`)) return
    reopenPic(pic.id, assignedKpe, null)
    afterMutation()
  }

  function updatePicAndReload(patch) {
    updatePicFields(pic.id, patch)
    afterMutation()
  }

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
              {editingName ? (
                <input
                  className="input text-xl py-1 font-display font-bold flex-1 min-w-0"
                  defaultValue={pic.name || ''}
                  autoFocus
                  placeholder="Name or descriptor"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updatePicAndReload({ name: e.currentTarget.value.trim() || null })
                      setEditingName(false)
                    }
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  onBlur={(e) => {
                    updatePicAndReload({ name: e.currentTarget.value.trim() || null })
                    setEditingName(false)
                  }}
                />
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-left flex-1 min-w-0 group"
                >
                  <span
                    className={`font-display font-bold text-2xl truncate group-hover:text-ink-100 transition ${
                      !pic.name ? 'text-ink-500 italic font-medium' : ''
                    }`}
                  >
                    {pic.name || pic.description || 'Tap to add name'}
                  </span>
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-ink-700 group-hover:text-ink-500 align-middle">
                    edit
                  </span>
                </button>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-400 flex-wrap">
              {editingTime ? (
                <div className="w-full max-w-xs">
                  <TimeDateEditor
                    value={pic.enteredCare}
                    onCommit={(newIso) => {
                      updatePicEnteredCare(pic.id, newIso)
                      afterMutation()
                      setEditingTime(false)
                    }}
                    onCancel={() => setEditingTime(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setEditingTime(true)}
                  className="font-display tabular-nums text-ink-300 hover:text-ink-100 underline-offset-4 hover:underline"
                  title="Edit time-in"
                >
                  In since {formatClock(pic.enteredCare)}
                  <span className="text-ink-500"> · {formatElapsed(elapsed)}</span>
                </button>
              )}
              {highest != null && highest !== code && (
                <span>
                  Peak: <span className="font-display font-bold">Code {highest}</span>
                </span>
              )}
              {isDischarged && (
                <span className="px-2 py-0.5 rounded-full bg-ink-800 border border-ink-700 text-ink-300 uppercase tracking-widest text-[10px] font-display font-bold">
                  Discharged{pic.leftCare ? ` · ${formatClock(pic.leftCare)}` : ''}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost px-3 shrink-0" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Monitoring footer in header for in-care code-3 */}
        {monitorState && (
          <div
            className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-display tabular-nums ${
              monitorState === 'overdue'
                ? 'bg-code-1/15 border border-code-1/40 text-code-1'
                : monitorState === 'due_soon'
                ? 'bg-code-3/15 border border-code-3/40 text-code-3'
                : 'bg-ink-800 border border-ink-700 text-ink-400'
            }`}
            data-tick={tick}
          >
            <span className="font-bold uppercase tracking-widest">
              {monitorState === 'overdue'
                ? '⚠ Welfare check overdue'
                : monitorState === 'due_soon'
                ? 'Welfare check due soon'
                : 'Last check'}
            </span>
            <span>{minsSince != null ? `${minsSince}m ago` : '—'}</span>
            <button
              onClick={onMarkChecked}
              className={`ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border transition ${
                monitorState === 'overdue'
                  ? 'bg-code-1 border-code-1 text-white hover:opacity-90'
                  : monitorState === 'due_soon'
                  ? 'bg-code-3 border-code-3 text-ink-950 hover:opacity-90'
                  : 'bg-ink-700 border-ink-600 text-ink-100 hover:bg-ink-600'
              }`}
            >
              Mark checked
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Code change */}
        <section>
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
            Update code
          </div>
          <div className="flex items-stretch gap-2">
            {(() => {
              const c = CODES[0]
              const active = code === 1
              return (
                <button
                  key={1}
                  type="button"
                  onClick={() => onCodeTap(1)}
                  className={`relative h-16 w-12 rounded-xl font-display font-bold ${c.tw} text-white transition border-2 flex flex-col items-center justify-center shrink-0 ${
                    active ? 'border-white shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  title="Code 1 — Emergency"
                >
                  <span className="text-xs leading-none mb-0.5">⚠</span>
                  <span className="leading-none text-xl">1</span>
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
                  className={`relative flex-1 h-16 rounded-xl font-display font-bold ${c.tw} ${tone} transition border-2 ${
                    active ? 'border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span className="text-xl">{c.code}</span>
                    {c.desc && (
                      <span className="text-[9px] uppercase tracking-widest font-semibold opacity-80">
                        {c.desc}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Assigned KPE — inline picker */}
        <section className="panel p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500">
              Assigned KPE
            </span>
            {!editingKpe && (
              <button
                onClick={() => setEditingKpe(true)}
                className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-ink-100"
              >
                {assignedKpe ? 'change' : 'assign'}
              </button>
            )}
          </div>
          {editingKpe ? (
            <KpeChipPicker
              currentKpe={assignedKpe}
              shift1Team={eventCfg.shift1Team || []}
              shift2Team={eventCfg.shift2Team || []}
              onSelect={onKpeChange}
              onDone={() => setEditingKpe(false)}
            />
          ) : (
            <button
              onClick={() => setEditingKpe(true)}
              className="text-left"
            >
              {assignedKpe ? (
                <span className={`inline-flex items-center gap-1.5 ${shiftClass} text-white text-sm font-semibold px-3 py-1.5 rounded-full`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  {assignedKpe}
                </span>
              ) : (
                <span className="text-ink-500 italic text-sm">Unassigned — tap to assign</span>
              )}
            </button>
          )}
        </section>

        {/* 2x2 grid */}
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
            displayChildren={<ChipDisplay values={referredByList} other={pic.referredByOther} />}
            renderEditor={() => (
              <ChipEditor
                options={REFERRED_BY}
                value={referredByList}
                otherValue={pic.referredByOther || ''}
                multi
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

        {/* Discharge fields — only shown when discharged. All editable. */}
        {isDischarged && (
          <div className="panel p-4 space-y-3 border-2 border-ink-700">
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
              Discharge details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EditableCell
                label="Outcome"
                displayChildren={
                  pic.outcome ? (
                    <span className="text-sm text-ink-200">
                      {pic.outcome === 'Other' ? pic.outcomeOther || 'Other' : pic.outcome}
                    </span>
                  ) : (
                    <span className="text-ink-500 italic text-sm">Not set</span>
                  )
                }
                renderEditor={() => (
                  <ChipEditor
                    options={OUTCOMES}
                    value={pic.outcome}
                    otherValue={pic.outcomeOther || ''}
                    onCommit={(value, otherValue) =>
                      updatePicAndReload({ outcome: value, outcomeOther: otherValue })
                    }
                  />
                )}
              />
              <EditableCell
                label="Referred to"
                displayChildren={<ChipDisplay values={referredToList} other={pic.referredToOther} />}
                renderEditor={() => (
                  <ChipEditor
                    options={REFERRED_TO}
                    value={referredToList}
                    otherValue={pic.referredToOther || ''}
                    multi
                    onCommit={(value, otherValue) =>
                      updatePicAndReload({ referredTo: value, referredToOther: otherValue })
                    }
                  />
                )}
              />
              <EditableCell
                label="Medical involved"
                displayChildren={
                  pic.medicalInvolved == null ? (
                    <span className="text-ink-500 italic text-sm">Not set</span>
                  ) : (
                    <span className={`text-sm font-semibold ${pic.medicalInvolved ? 'text-code-1' : 'text-ink-200'}`}>
                      {pic.medicalInvolved ? 'Yes' : 'No'}
                    </span>
                  )
                }
                renderEditor={() => (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updatePicAndReload({ medicalInvolved: false })}
                      className={`h-12 rounded-lg font-bold border-2 ${
                        pic.medicalInvolved === false
                          ? 'bg-ink-100 text-ink-950 border-white'
                          : 'bg-ink-900 text-ink-300 border-ink-700'
                      }`}
                    >
                      No
                    </button>
                    <button
                      onClick={() => updatePicAndReload({ medicalInvolved: true })}
                      className={`h-12 rounded-lg font-bold border-2 ${
                        pic.medicalInvolved === true
                          ? 'bg-code-1 text-white border-white'
                          : 'bg-ink-900 text-ink-300 border-ink-700'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                )}
              />
              <EditableCell
                label="Last KPE"
                displayChildren={
                  pic.lastKpe ? (
                    <span className="text-sm text-ink-200">{pic.lastKpe}</span>
                  ) : (
                    <span className="text-ink-500 italic text-sm">Not set</span>
                  )
                }
                renderEditor={({ done }) => (
                  <KpeChipPicker
                    currentKpe={pic.lastKpe}
                    shift1Team={eventCfg.shift1Team || []}
                    shift2Team={eventCfg.shift2Team || []}
                    onSelect={(v) => updatePicAndReload({ lastKpe: v })}
                    onDone={done}
                  />
                )}
              />
            </div>

            <EditableCell
              label="TL sign-off"
              displayChildren={
                pic.tlSignoff ? (
                  <span className="inline-flex items-center gap-1.5 bg-code-3/15 border border-code-3/40 text-code-3 text-sm font-semibold px-3 py-1 rounded-full">
                    {pic.tlSignoff}
                  </span>
                ) : (
                  <span className="text-ink-500 italic text-sm">Not set</span>
                )
              }
              renderEditor={({ done }) => (
                <KpeChipPicker
                  currentKpe={pic.tlSignoff}
                  shift1Team={eventCfg.shift1Team || []}
                  shift2Team={eventCfg.shift2Team || []}
                  onSelect={(v) => updatePicAndReload({ tlSignoff: v })}
                  onDone={done}
                  allowClear={false}
                />
              )}
            />
          </div>
        )}

        {/* Event history — latest always visible */}
        <section className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-300">
              Latest event {eventCount > 1 && <span className="text-ink-500">· {eventCount} total</span>}
            </span>
            {eventCount > 1 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-ink-100"
              >
                {showHistory ? 'hide history' : 'show history'}
              </button>
            )}
          </div>

          {/* Always show the latest entry */}
          {latestEvent ? (
            <ol>
              <EventLogItem event={latestEvent} />
            </ol>
          ) : (
            <p className="text-sm text-ink-500 italic">No events logged yet.</p>
          )}

          {/* Older entries when expanded */}
          {showHistory && eventCount > 1 && (
            <div className="mt-3 pt-3 border-t border-ink-800">
              <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
                Earlier
              </div>
              <ol className="space-y-2">
                {events
                  .filter((e) => e.picId === pic.id && e.id !== latestEvent.id)
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((e) => (
                    <EventLogItem key={e.id} event={e} />
                  ))}
              </ol>
            </div>
          )}

          {/* Add note */}
          {noteOpen ? (
            <div className="mt-3 space-y-2">
              <textarea
                className="input min-h-[5rem]"
                placeholder="Note: observations, status update, etc."
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
          ) : (
            <button
              onClick={() => setNoteOpen(true)}
              className="mt-3 btn-ghost w-full"
            >
              + Add note
            </button>
          )}
        </section>

        {/* Discharge / reopen button */}
        <div className="pt-2">
          {!isDischarged ? (
            <button
              onClick={() => setDischargeOpen(true)}
              className="btn-primary w-full text-base py-3"
            >
              Discharge PIC #{pic.number}
            </button>
          ) : (
            <button
              onClick={onReopen}
              className="btn-ghost w-full"
            >
              Reopen — move back to in-care
            </button>
          )}
        </div>
      </div>

      <Code1Warning
        open={code1Pending != null}
        onCancel={() => setCode1Pending(null)}
        onContinue={acknowledgeCode1}
      />

      <DischargeModal
        open={dischargeOpen}
        pic={pic}
        eventCfg={eventCfg}
        onClose={() => setDischargeOpen(false)}
        onDischarged={afterMutation}
      />
    </PanelShell>
  )
}

// ---------- Subcomponents ----------

function ChipDisplay({ values, other }) {
  const list = Array.isArray(values) ? values : values ? [values] : []
  const displayList = [
    ...list.filter((s) => s !== 'Other'),
    ...(list.includes('Other') && other ? [other] : []),
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

function PanelShell({ children, onClose }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 lg:bg-transparent lg:pointer-events-none"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-40 bg-ink-950 border-l border-ink-800 shadow-2xl flex flex-col w-full lg:w-[560px]"
        style={{ animation: 'slideIn 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        {children}
      </aside>
    </>
  )
}
