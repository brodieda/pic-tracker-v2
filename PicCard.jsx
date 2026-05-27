import { useEffect, useState } from 'react'
import { dischargePic, getAssignedKpe, nowIso, formatClock } from '../lib/helpers'
import { OUTCOMES, REFERRED_TO } from '../constants/options'
import ChipGroup from './ChipGroup'
import KpeChipPicker from './KpeChipPicker'
import TimeDateEditor from './TimeDateEditor'

export default function DischargeModal({ open, pic, eventCfg, onClose, onDischarged }) {
  const [leftCare, setLeftCare] = useState(nowIso())
  const [outcome, setOutcome] = useState(null)
  const [outcomeOther, setOutcomeOther] = useState('')
  const [referredTo, setReferredTo] = useState([])
  const [referredToOther, setReferredToOther] = useState('')
  const [medicalInvolved, setMedicalInvolved] = useState(null)
  const [lastKpe, setLastKpe] = useState(null)
  const [editingLastKpe, setEditingLastKpe] = useState(false)
  const [tlSignoff, setTlSignoff] = useState(null)
  const [editingTlSignoff, setEditingTlSignoff] = useState(false)
  const [securityNotified, setSecurityNotified] = useState(null)
  const [softWarnOpen, setSoftWarnOpen] = useState(false)

  useEffect(() => {
    if (open && pic) {
      setLeftCare(nowIso())
      setOutcome(null)
      setOutcomeOther('')
      setReferredTo([])
      setReferredToOther('')
      setMedicalInvolved(null)
      setLastKpe(getAssignedKpe(pic) || null)
      setEditingLastKpe(false)
      setTlSignoff(null)
      setEditingTlSignoff(false)
      setSecurityNotified(null)
      setSoftWarnOpen(false)
    }
  }, [open, pic])

  if (!open || !pic) return null

  const isEjectionFlagged = !!pic.ejectionFlag

  const finaliseDischarge = () => {
    dischargePic(pic.id, {
      leftCare,
      outcome,
      outcomeOther: outcome === 'Other' ? outcomeOther.trim() || null : null,
      referredTo,
      referredToOther: referredTo.includes('Other') ? referredToOther.trim() || null : null,
      medicalInvolved,
      lastKpe,
      tlSignoff,
      securityNotified: isEjectionFlagged ? securityNotified : null,
    })
    onDischarged?.()
    onClose?.()
  }

  const submit = () => {
    // Soft warning when flagged AND security not notified
    if (isEjectionFlagged && securityNotified === false) {
      setSoftWarnOpen(true)
      return
    }
    finaliseDischarge()
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
          {/* Security Monitored reminder — first thing they see */}
          {isEjectionFlagged && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-slate-100 text-ink-950 border-2 border-slate-100">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink-950 text-slate-100 text-sm font-display font-black shrink-0 leading-none">
                ⚑
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-display font-bold uppercase tracking-widest">
                  Security Monitored — Action Required
                </div>
                <div className="text-sm mt-0.5">
                  This patron is on the ejection pathway. RSA/Security must be notified before they leave the space.
                </div>
              </div>
            </div>
          )}

          {/* Time out — editor open by default in live mode */}
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2 flex items-center justify-between">
              <span>Time out</span>
              <button
                onClick={() => setLeftCare(nowIso())}
                className="text-[10px] uppercase tracking-widest text-ink-400 hover:text-ink-100"
              >
                reset to now
              </button>
            </div>
            <div className="max-w-xs">
              <TimeDateEditor
                key={leftCare}
                value={leftCare}
                onCommit={(iso) => setLeftCare(iso)}
                mode="live"
              />
            </div>
          </div>

          {/* Outcome */}
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2">
              Outcome
            </div>
            <ChipGroup
              options={OUTCOMES}
              value={outcome}
              onChange={setOutcome}
              otherValue={outcomeOther}
              onOtherChange={setOutcomeOther}
            />
          </div>

          {/* Referred to */}
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
              Medical involved?
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMedicalInvolved(medicalInvolved === false ? null : false)}
                className={`h-16 rounded-xl font-display font-bold text-xl border-2 transition ${
                  medicalInvolved === false
                    ? 'bg-ink-100 text-ink-950 border-white shadow-lg'
                    : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
                }`}
              >
                No
              </button>
              <button
                onClick={() => setMedicalInvolved(medicalInvolved === true ? null : true)}
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

          {/* Security/RSA notified — only shown when ejection flag is set */}
          {isEjectionFlagged && (
            <div>
              <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2">
                Security / RSA notified?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSecurityNotified(securityNotified === false ? null : false)}
                  className={`h-16 rounded-xl font-display font-bold text-xl border-2 transition ${
                    securityNotified === false
                      ? 'bg-code-1 text-white border-white shadow-lg'
                      : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
                  }`}
                >
                  No
                </button>
                <button
                  onClick={() => setSecurityNotified(securityNotified === true ? null : true)}
                  className={`h-16 rounded-xl font-display font-bold text-xl border-2 transition ${
                    securityNotified === true
                      ? 'bg-code-5 text-white border-white shadow-lg'
                      : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>
          )}

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
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
                TL sign-off
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
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-ink-800 border border-ink-700 text-ink-100 text-sm font-semibold px-3 py-1.5 rounded-full">
                {tlSignoff}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-6 py-4 flex items-center gap-3">
          <span className="text-xs text-ink-500 flex-1">
            All fields optional — fill what you can, edit later from the panel
          </span>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>
            Discharge PIC #{pic.number}
          </button>
        </div>
      </div>

      {/* Soft warning when discharging a flagged PIC without notifying security */}
      {softWarnOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-ink-950 rounded-2xl border-2 border-slate-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-800 flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-ink-950 font-display font-black">
                ⚑
              </span>
              <h3 className="font-display font-bold text-base text-ink-100">
                Security not notified
              </h3>
            </div>
            <div className="px-5 py-4 text-sm text-ink-200">
              This patron was flagged as Security Monitored and you've recorded that
              Security/RSA has <span className="font-bold text-code-1">not</span> been notified.
              <div className="mt-2 text-ink-400">
                Discharge anyway?
              </div>
            </div>
            <div className="px-5 py-3 border-t border-ink-800 flex items-center justify-end gap-2">
              <button className="btn-ghost" onClick={() => setSoftWarnOpen(false)}>
                Go back
              </button>
              <button
                className="btn bg-code-1 text-white hover:opacity-90"
                onClick={() => {
                  setSoftWarnOpen(false)
                  finaliseDischarge()
                }}
              >
                Discharge anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
