import { useEffect, useMemo, useState } from 'react'
import { getEvent, addPic, addEvent, nextPicId, nextEventId } from '../lib/store'
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

const initialForm = {
  name: '',
  code: null,
  enteredCare: nowIso(),
  referredBy: null,
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

export default function IntakeModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm)
  const [showOptional, setShowOptional] = useState(false)
  const [error, setError] = useState(null)
  const [eventCfg, setEventCfg] = useState({ shift1Team: [], shift2Team: [] })

  useEffect(() => {
    if (open) {
      setForm({ ...initialForm, enteredCare: nowIso() })
      setShowOptional(false)
      setError(null)
      setEventCfg(getEvent())
    }
  }, [open])

  const allKpes = useMemo(
    () => Array.from(new Set([...(eventCfg.shift1Team || []), ...(eventCfg.shift2Team || [])])),
    [eventCfg],
  )

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const handleSubmit = () => {
    setError(null)

    // Validation: name required, code required, intake KPE required
    if (!form.name.trim()) return setError('PIC name or descriptor is required.')
    if (form.code == null) return setError('Severity code is required.')
    if (!form.intakeKpe.trim()) return setError('Intake KPE is required.')

    const picId = nextPicId()
    const ts = form.enteredCare || nowIso()

    const pic = {
      id: picId,
      name: form.name.trim(),
      gender: form.gender,
      ageRange: form.ageRange,
      description: form.description.trim() || null,
      enteredCare: ts,
      leftCare: null,
      referredBy: form.referredBy,
      referredByOther: form.referredBy === 'Other' ? form.referredByOther.trim() || null : null,
      substances: form.substances,
      substanceOther: form.substances.includes('Other') ? form.substanceOther.trim() || null : null,
      presentations: form.presentations,
      presentationOther: form.presentations.includes('Other')
        ? form.presentationOther.trim() || null
        : null,
      intakeKpe: form.intakeKpe.trim(),
      currentKpe: form.intakeKpe.trim(),
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

    // Emit admit event
    addEvent({
      id: nextEventId(),
      picId,
      timestamp: ts,
      type: 'admit',
      code: form.code,
      kpe: form.intakeKpe.trim(),
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
        {/* Header */}
        <div className="px-6 py-5 border-b border-ink-800 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ new pic</p>
            <h2 className="text-xl font-display font-bold">Admit to care</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" aria-label="Close">
            Cancel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
          {/* Name + time-in row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="label">PIC name or descriptor *</label>
              <input
                className="input"
                placeholder="e.g. Leah, or 'red shirt male'"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Time in</label>
              <div className="flex items-center gap-2">
                <div className="input flex-1 font-display tabular-nums">
                  {formatClock(form.enteredCare)}
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => update({ enteredCare: nowIso() })}
                  title="Reset to now"
                >
                  Now
                </button>
              </div>
            </div>
          </div>

          {/* Severity code */}
          <div>
            <label className="label">Severity code *</label>
            <div className="grid grid-cols-5 gap-2">
              {CODES.map((c) => {
                const active = form.code === c.code
                const tone = c.code === 3 ? 'text-ink-950' : 'text-white'
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => update({ code: c.code })}
                    className={`relative h-20 rounded-xl font-display font-bold text-2xl ${c.tw} ${tone} transition border-2 ${
                      active ? 'border-white scale-[1.02] shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {c.code}
                    {(c.desc) && (
                      <span className="absolute bottom-1 left-0 right-0 text-[10px] uppercase tracking-widest font-semibold opacity-80">
                        {c.desc}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Intake KPE */}
          <div>
            <label className="label">Intake KPE *</label>
            <input
              className="input"
              list="kpe-list"
              placeholder="Who's logging this intake?"
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
                No KPEs configured yet — add rosters in Settings, or type a name freely.
              </p>
            )}
          </div>

          {/* Referred by */}
          <div>
            <label className="label">Referred by</label>
            <ChipGroup
              options={REFERRED_BY}
              value={form.referredBy}
              onChange={(v) => update({ referredBy: v })}
              otherValue={form.referredByOther}
              onOtherChange={(v) => update({ referredByOther: v })}
            />
          </div>

          {/* Substances */}
          <div>
            <label className="label">Substances <span className="text-ink-500 normal-case tracking-normal">(multi-select)</span></label>
            <ChipGroup
              options={SUBSTANCES}
              value={form.substances}
              onChange={(v) => update({ substances: v })}
              multi
              otherValue={form.substanceOther}
              onOtherChange={(v) => update({ substanceOther: v })}
            />
          </div>

          {/* Presentations */}
          <div>
            <label className="label">Presentations <span className="text-ink-500 normal-case tracking-normal">(multi-select)</span></label>
            <ChipGroup
              options={PRESENTATIONS}
              value={form.presentations}
              onChange={(v) => update({ presentations: v })}
              multi
              otherValue={form.presentationOther}
              onOtherChange={(v) => update({ presentationOther: v })}
            />
          </div>

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
                <div>
                  <label className="label">Gender</label>
                  <ChipGroup
                    options={GENDERS}
                    value={form.gender}
                    onChange={(v) => update({ gender: v })}
                  />
                </div>
                <div>
                  <label className="label">Age range</label>
                  <ChipGroup
                    options={AGE_RANGES}
                    value={form.ageRange}
                    onChange={(v) => update({ ageRange: v })}
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    className="input"
                    placeholder="What they're wearing, anything distinctive…"
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Intake note</label>
                  <textarea
                    className="input min-h-[5rem]"
                    placeholder="Initial observations, friends present, etc."
                    value={form.intakeNote}
                    onChange={(e) => update({ intakeNote: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-6 py-4 flex items-center gap-3">
          {error && (
            <span className="text-sm text-code-5 font-semibold flex-1">{error}</span>
          )}
          {!error && (
            <span className="text-xs text-ink-500 flex-1">
              * required: name, code, intake KPE
            </span>
          )}
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Admit PIC</button>
        </div>
      </div>
    </div>
  )
}
