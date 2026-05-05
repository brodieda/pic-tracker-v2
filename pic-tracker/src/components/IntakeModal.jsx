import { useEffect, useMemo, useState } from 'react'
import {
  getEvent,
  getPics,
  addPic,
  addEvent,
  peekNextPicNumber,
  claimNextPicNumber,
  picIdFromNumber,
  nextEventId,
} from '../lib/store'
import { nowIso, formatClock } from '../lib/helpers'
import {
  REFERRED_BY,
  SUBSTANCES,
  PRESENTATIONS,
  GENDERS,
  AGE_RANGES,
  CODES,
} from '../constants/options'
import ChipGroup from './ChipGroup'
import Code1Warning from './Code1Warning'

const initialForm = {
  name: '',
  code: null,
  enteredCare: nowIso(),
  referredBy: [],
  referredByOther: '',
  substances: [],
  substanceOther: '',
  presentations: [],
  presentationOther: '',
  intakeKpe: '',
  gender: null,
  ageRange: null,
  description: '',
  intakeNote: '',
}

// Inline row layout: label left, content right. Wraps cleanly on narrow screens.
function FieldRow({ label, hint, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] sm:gap-5 gap-2 items-start">
      <div className="pt-1">
        <div className="text-xs font-display font-semibold uppercase tracking-[0.14em] text-ink-300">
          {label}
        </div>
        {hint && <div className="text-[11px] text-ink-500 mt-1">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function IntakeModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm)
  const [showOptional, setShowOptional] = useState(false)
  const [error, setError] = useState(null)
  const [eventCfg, setEventCfg] = useState({ shift1Team: [], shift2Team: [] })
  const [picNumber, setPicNumber] = useState(null)
  const [code1Pending, setCode1Pending] = useState(false) // showing the Code 1 warning
  const [overCapacityAck, setOverCapacityAck] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...initialForm, enteredCare: nowIso() })
      setShowOptional(false)
      setError(null)
      setEventCfg(getEvent())
      setPicNumber(peekNextPicNumber())
      setCode1Pending(false)
      setOverCapacityAck(false)
    }
  }, [open])

  const allKpes = useMemo(
    () => Array.from(new Set([...(eventCfg.shift1Team || []), ...(eventCfg.shift2Team || [])])),
    [eventCfg],
  )

  // Capacity check
  const inCareCount = useMemo(
    () => (open ? getPics().filter((p) => p.status === 'in_care').length : 0),
    [open],
  )
  const capacity = eventCfg.capacity
  const atCapacity = capacity != null && inCareCount >= capacity

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const onSelectCode = (code) => {
    if (code === 1 && form.code !== 1) {
      // Show emergency warning before committing the selection
      setCode1Pending(true)
      return
    }
    update({ code })
  }

  const handleSubmit = () => {
    setError(null)

    if (form.code == null) return setError('Severity code is required.')

    if (atCapacity && !overCapacityAck) {
      setError(
        `At capacity (${inCareCount}/${capacity}). Tap Admit again to override and admit anyway.`,
      )
      setOverCapacityAck(true)
      return
    }

    // Claim a stable PIC number atomically (writes to localStorage seq)
    const num = claimNextPicNumber()
    const picId = picIdFromNumber(num)
    const ts = form.enteredCare || nowIso()

    // Name fallback: if no name typed, use the description as a fallback descriptor.
    // If neither, leave as null — the PIC # is the identifier.
    const trimmedName = form.name.trim()
    const trimmedDesc = form.description.trim()
    const nameValue = trimmedName || trimmedDesc || null

    const pic = {
      id: picId,
      number: num,
      name: nameValue,
      gender: form.gender,
      ageRange: form.ageRange,
      description: trimmedDesc || null,
      enteredCare: ts,
      leftCare: null,
      referredBy: form.referredBy,
      referredByOther: form.referredBy.includes('Other') ? form.referredByOther.trim() || null : null,
      substances: form.substances,
      substanceOther: form.substances.includes('Other') ? form.substanceOther.trim() || null : null,
      presentations: form.presentations,
      presentationOther: form.presentations.includes('Other')
        ? form.presentationOther.trim() || null
        : null,
      intakeKpe: form.intakeKpe.trim() || null,  // legacy field, kept for back-compat
      assignedKpe: form.intakeKpe.trim() || null,
      outcome: null,
      outcomeOther: null,
      referredTo: null,
      referredToOther: null,
      medicalInvolved: null,
      lastKpe: null,
      tlSignoff: null,
      status: 'in_care',
    }

    addPic(pic)

    addEvent({
      id: nextEventId(),
      picId,
      timestamp: ts,
      type: 'admit',
      code: form.code,
      kpe: form.intakeKpe.trim() || null,
      note: form.intakeNote.trim() || null,
      meta: {},
    })

    onCreated?.(pic)
    onClose?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[92vh] bg-ink-950 sm:rounded-2xl border border-ink-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header — PIC # is the headline */}
        <div className="px-6 py-5 border-b border-ink-800 flex items-center gap-4">
          <div className="flex-1 flex items-baseline gap-3">
            <span className="font-display font-black text-3xl tabular-nums tracking-tight">
              #{picNumber}
            </span>
            <div>
              <p className="text-[10px] font-display tracking-[0.3em] uppercase text-ink-500">
                / new pic
              </p>
              <h2 className="text-base font-display font-bold text-ink-200">Admit to care</h2>
            </div>
          </div>
          {capacity != null && (
            <div
              className={`text-xs font-display tabular-nums px-2.5 py-1 rounded-md border ${
                atCapacity
                  ? 'border-code-1 text-code-1'
                  : inCareCount >= capacity - 3
                  ? 'border-code-3 text-code-3'
                  : 'border-ink-700 text-ink-400'
              }`}
            >
              {inCareCount} / {capacity} spaces
            </div>
          )}
          <button onClick={onClose} className="btn-ghost" aria-label="Close">
            Cancel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Name + time-in row */}
          <FieldRow
            label="PIC name / descriptor"
            hint="Optional — # is the identifier"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input"
                placeholder="e.g. Leah, or 'red shirt male'"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                autoFocus
              />
              <div className="flex items-center gap-2 sm:w-44">
                <div className="input flex-1 font-display tabular-nums text-center">
                  {formatClock(form.enteredCare)}
                </div>
                <button
                  type="button"
                  className="btn-ghost px-3"
                  onClick={() => update({ enteredCare: nowIso() })}
                  title="Reset to now"
                >
                  Now
                </button>
              </div>
            </div>
          </FieldRow>

          <div className="divider" />

          {/* Severity code — Code 1 visually deprioritised */}
          <FieldRow
            label="Severity code *"
            hint="1 = emergency, 5 = lowest"
          >
            <div className="space-y-2">
              <div className="flex items-stretch gap-2">
                {/* Code 1 — same height, narrower width */}
                {(() => {
                  const c = CODES[0]
                  const active = form.code === 1
                  return (
                    <button
                      key={1}
                      type="button"
                      onClick={() => onSelectCode(1)}
                      className={`relative h-20 w-14 rounded-xl font-display font-bold ${c.tw} text-white transition border-2 flex flex-col items-center justify-center shrink-0 ${
                        active
                          ? 'border-white scale-[1.02] shadow-lg'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      title="Code 1 — Emergency"
                    >
                      <span className="text-xs leading-none mb-1">⚠</span>
                      <span className="leading-none text-2xl">1</span>
                      <span className="text-[9px] uppercase tracking-widest font-semibold opacity-80 mt-1">
                        Emerg
                      </span>
                    </button>
                  )
                })()}
                <div className="w-px bg-ink-800 mx-1" />
                {/* Codes 2-5 — full size, descriptor inline-stacked */}
                {CODES.slice(1).map((c) => {
                  const active = form.code === c.code
                  const tone = c.code === 3 ? 'text-ink-950' : 'text-white'
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => onSelectCode(c.code)}
                      className={`relative flex-1 h-20 rounded-xl font-display font-bold ${c.tw} ${tone} transition border-2 ${
                        active
                          ? 'border-white scale-[1.02] shadow-lg'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-2xl">{c.code}</span>
                        {c.desc && (
                          <span className="text-[10px] uppercase tracking-widest font-semibold opacity-80 mt-0.5">
                            {c.desc}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              {form.code === 1 && (
                <div className="text-xs text-code-1 font-semibold flex items-center gap-2 pl-1">
                  ⚠ Medical emergency — escalate immediately
                </div>
              )}
            </div>
          </FieldRow>

          <div className="divider" />

          <FieldRow label="Assigned KPE" hint="Optional — can assign later">

            <input
              className="input"
              list="kpe-list"
              placeholder="Start typing a name…"
              value={form.intakeKpe}
              onChange={(e) => update({ intakeKpe: e.target.value })}
            />
            <datalist id="kpe-list">
              {allKpes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {allKpes.length === 0 && (
              <p className="text-xs text-code-3 mt-2">
                No KPEs configured yet — add rosters in Settings.
              </p>
            )}
          </FieldRow>

          <div className="divider" />

          <FieldRow label="Referred by" hint="Multi-select">
            <ChipGroup
              options={REFERRED_BY}
              value={form.referredBy}
              onChange={(v) => update({ referredBy: v })}
              multi
              otherValue={form.referredByOther}
              onOtherChange={(v) => update({ referredByOther: v })}
            />
          </FieldRow>

          <FieldRow label="Substances" hint="Multi-select">
            <ChipGroup
              options={SUBSTANCES}
              value={form.substances}
              onChange={(v) => update({ substances: v })}
              multi
              otherValue={form.substanceOther}
              onOtherChange={(v) => update({ substanceOther: v })}
            />
          </FieldRow>

          <FieldRow label="Presentations" hint="Multi-select">
            <ChipGroup
              options={PRESENTATIONS}
              value={form.presentations}
              onChange={(v) => update({ presentations: v })}
              multi
              otherValue={form.presentationOther}
              onOtherChange={(v) => update({ presentationOther: v })}
            />
          </FieldRow>

          {/* Optional disclosure */}
          <div className="border-t border-ink-800 pt-5">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-ink-300 hover:text-ink-100"
            >
              <span className={`inline-block transition ${showOptional ? 'rotate-90' : ''}`}>›</span>
              Optional details (gender, age, description, intake note)
            </button>

            {showOptional && (
              <div className="mt-5 space-y-5">
                <FieldRow label="Gender">
                  <ChipGroup
                    options={GENDERS}
                    value={form.gender}
                    onChange={(v) => update({ gender: v })}
                  />
                </FieldRow>
                <FieldRow label="Age range">
                  <ChipGroup
                    options={AGE_RANGES}
                    value={form.ageRange}
                    onChange={(v) => update({ ageRange: v })}
                  />
                </FieldRow>
                <FieldRow label="Description">
                  <input
                    className="input"
                    placeholder="What they're wearing, anything distinctive…"
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Intake note">
                  <textarea
                    className="input min-h-[5rem]"
                    placeholder="Initial observations, friends present, etc."
                    value={form.intakeNote}
                    onChange={(e) => update({ intakeNote: e.target.value })}
                  />
                </FieldRow>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-6 py-4 flex items-center gap-3">
          {error ? (
            <span className="text-sm text-code-1 font-semibold flex-1">{error}</span>
          ) : atCapacity ? (
            <span className="text-sm text-code-3 font-semibold flex-1">
              At capacity ({inCareCount}/{capacity}) — admit will require override
            </span>
          ) : (
            <span className="text-xs text-ink-500 flex-1">
              * required: code

            </span>
          )}
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={atCapacity ? 'btn-danger' : 'btn-primary'}
            onClick={handleSubmit}
          >
            {atCapacity && overCapacityAck ? `Admit #${picNumber} anyway` : `Admit PIC #${picNumber}`}
          </button>
        </div>
      </div>

      <Code1Warning
        open={code1Pending}
        onCancel={() => setCode1Pending(false)}
        onContinue={() => {
          update({ code: 1 })
          setCode1Pending(false)
        }}
      />
    </div>
  )
}
