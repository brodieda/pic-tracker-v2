/**
 * Code1Warning — confirmation modal shown whenever Code 1 is tapped.
 * Code 1 = medical emergency, should not normally be in the carespace.
 *
 * Props:
 *  - open: bool
 *  - onCancel: () => void   (back out of the Code 1 selection)
 *  - onContinue: () => void (acknowledge and proceed with logging)
 */
export default function Code1Warning({ open, onCancel, onContinue }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-ink-950 border-2 border-code-1 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-code-1 px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">⚠</span>
          <h3 className="font-display font-bold text-white text-lg uppercase tracking-wider">
            Code 1 — Medical Emergency
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-ink-100 font-semibold">
            Escalate to medical immediately.
          </p>
          <p className="text-ink-300 text-sm leading-relaxed">
            Code 1 indicates a medical emergency. This person should not normally remain in
            the carespace. Ensure medical has been called or the person has been transferred
            before continuing.
          </p>
          <p className="text-ink-400 text-xs">
            Continue logging in PIC Tracker only if you need to maintain a record of this
            person's brief time in the carespace before handover.
          </p>
        </div>
        <div className="border-t border-ink-800 px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button onClick={onCancel} className="btn-ghost">
            Cancel — choose different code
          </button>
          <button onClick={onContinue} className="btn-danger">
            Acknowledged, continue logging
          </button>
        </div>
      </div>
    </div>
  )
}
