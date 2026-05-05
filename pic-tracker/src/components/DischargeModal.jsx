import { useEffect, useState } from 'react'
import { dischargePic, getAssignedKpe, nowIso, formatClock, isoToDatetimeLocal, datetimeLocalToIso } from '../lib/helpers'
import { OUTCOMES, REFERRED_TO } from '../constants/options'
import ChipGroup from './ChipGroup'
import KpeChipPicker from './KpeChipPicker'
import TimeDateEditor from './TimeDateEditor'

export default function DischargeModal({ open, pic, eventCfg, onClose, onDischarged }) {
  const [leftCare, setLeftCare] = useState(nowIso())
  const [editingTime, setEditingTime] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [outcomeOther, setOutcomeOther] = useState('')
  const [referredTo, setReferredTo] = useState([])
  const [referredToOther, setReferredToOther] = useState('')
  const [medicalInvolved, setMedicalInvolved] = useState(null)
  const [lastKpe, setLastKpe] = useState(null)
  const [editingLastKpe, setEditingLastKpe] = useState(false)
  const [tlSignoff, setTlSignoff] = useState(null)
  const [editingTlSignoff, setEditingTlSignoff] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && pic) {
      setLeftCare(nowIso())
      setEditingTime(false)
      setOutcome(null)
      setOutcomeOther('')
      setReferredTo([])
      setReferredToOther('')
      setMedicalInvolved(null)
      setLastKpe(getAssignedKpe(pic) || null)
      setEditingLastKpe(false)
      setTlSignoff(null)
      setEditingTlSignoff(false)
      setError(null)
    }
  }, [open, pic])

  if (!open || !pic) return null

  const allKpes = Array.from(new Set([...(eventCfg?.shift1Team || []), ...(eventCfg?.shift2Team || [])]))

  const submit = () => {
    setError(null)
    if (!outcome) return setError('Outcome is required.')
    if (medicalInvolved == null) return setError('Medical involvement is required.')
    if (!tlSignoff) return setError('TL sign-off is required.')

    dischargePic(pic.id, {
      leftCare,
      outcome,
      outcomeOther: outcome === 'Other' ? outcomeOther.trim() || null : null,
      referredTo,
      referredToOther: referredTo.includes('Other') ? referredToOther.trim() || null : null,
      medicalInvolved,
      lastKpe,
      tlSignoff,
    })
    onDischarged?.()
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[92vh] bg-ink-950 sm:rounded-2xl border border-ink-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-ink-800 flex items-center gap-4">
          <div className="flex-1 flex items-baseline gap-3">
            <span className="font-display font-black text-2xl tabular-nums">#{pic.number}</span>
            <div>
              <p className="text-[10px] font-display tracking-[0.3em] uppercase text-ink-500">/ discharge</p>
              <h2 className="text-base font-display font-bold text-ink-200">
                {pic.name || pic.description || '— no name —'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" aria-label="Close">
            Cancel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Time out */}
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2">
              Time out
            </div>
            {editingTime ? (
              <div className="max-w-xs">
                <TimeDateEditor
                  value={leftCare}
                  onCommit={(iso) => {
                    setLeftCare(iso)
                    setEditingTime(false)
                  }}
                  onCancel={() => setEditingTime(false)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-display font-bold tabular-nums text-2xl text-ink-100">
                  {formatClock(leftCare)}
                </span>
                <button
                  onClick={() => setEditingTime(true)}
                  className="btn-ghost text-sm"
                >
                  Edit time
                </button>
                <button
                  onClick={() => setLeftCare(nowIso())}
                  className="text-xs text-ink-400 hover:text-ink-100 underline-offset-4 hover:underline"
                >
                  Reset to now
                </button>
              </div>
            )}
          </div>

          {/* Outcome */}
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2">
              Outcome <span className="text-code-1">*</span>
            </div>
            <ChipGroup
              options={OUTCOMES}
              value={outcome}
              onChange={setOutcome}
              otherValue={outcomeOther}
              onOtherChange={setOutcomeOther}
            />
          </div>

          {/* Referred to (multi) */}
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2">
              Referred to <span className="text-ink-500 normal-case tracking-normal">(multi-select)</span>
            </div>
            <ChipGroup
              options={REFERRED_TO}
              value={referredTo}
              onChange={setReferredTo}
              multi
              otherValue={referredToOther}
              onOtherChange={setReferredToOther}
            />
          </div>

          {/* Medical involved */}
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2">
              Medical involved? <span className="text-code-1">*</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMedicalInvolved(false)}
                className={`h-16 rounded-xl font-display font-bold text-xl border-2 transition ${
                  medicalInvolved === false
                    ? 'bg-ink-100 text-ink-950 border-white shadow-lg'
                    : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
                }`}
              >
                No
              </button>
              <button
                onClick={() => setMedicalInvolved(true)}
                className={`h-16 rounded-xl font-display font-bold text-xl border-2 transition ${
                  medicalInvolved === true
                    ? 'bg-code-1 text-white border-white shadow-lg'
                    : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          {/* Last KPE */}
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
                Last KPE
              </span>
              {!editingLastKpe && (
                <button
                  onClick={() => setEditingLastKpe(true)}
                  className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-ink-100"
                >
                  change
                </button>
              )}
            </div>
            {editingLastKpe ? (
              <KpeChipPicker
                currentKpe={lastKpe}
                shift1Team={eventCfg?.shift1Team || []}
                shift2Team={eventCfg?.shift2Team || []}
                onSelect={setLastKpe}
                onDone={() => setEditingLastKpe(false)}
              />
            ) : (
              <div>
                {lastKpe ? (
                  <span className="inline-flex items-center gap-1.5 bg-ink-800 border border-ink-700 text-ink-100 text-sm font-semibold px-3 py-1.5 rounded-full">
                    {lastKpe}
                  </span>
                ) : (
                  <button
                    onClick={() => setEditingLastKpe(true)}
                    className="text-ink-500 italic text-sm hover:text-ink-300"
                  >
                    Tap to assign
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TL sign-off */}
          <div className="panel p-4 border-2 border-code-3/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
                TL sign-off <span className="text-code-1">*</span>
              </span>
              {!editingTlSignoff && tlSignoff && (
                <button
                  onClick={() => setEditingTlSignoff(true)}
                  className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-ink-100"
                >
                  change
                </button>
              )}
            </div>
            {editingTlSignoff || !tlSignoff ? (
              <KpeChipPicker
                currentKpe={tlSignoff}
                shift1Team={eventCfg?.shift1Team || []}
                shift2Team={eventCfg?.shift2Team || []}
                onSelect={setTlSignoff}
                onDone={() => setEditingTlSignoff(false)}
                allowClear={false}
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-code-3/15 border border-code-3/40 text-code-3 text-sm font-semibold px-3 py-1.5 rounded-full">
                {tlSignoff}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-6 py-4 flex items-center gap-3">
          {error ? (
            <span className="text-sm text-code-1 font-semibold flex-1">{error}</span>
          ) : (
            <span className="text-xs text-ink-500 flex-1">
              <span className="text-code-1">*</span> required: outcome, medical Y/N, TL sign-off
            </span>
          )}
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>
            Discharge PIC #{pic.number}
          </button>
        </div>
      </div>
    </div>
  )
}
