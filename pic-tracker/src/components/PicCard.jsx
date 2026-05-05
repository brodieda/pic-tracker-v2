import CodeBadge from './CodeBadge'
import { elapsedMinutes, formatElapsed, formatClock, currentCodeFor, shiftFor, getAssignedKpe } from '../lib/helpers'

export default function PicCard({ pic, events, eventCfg, onClick }) {
  const code = currentCodeFor(pic.id, events)
  const isDischarged = pic.status === 'discharged'
  const elapsed = elapsedMinutes(pic.enteredCare, pic.leftCare)
  const assignedKpe = getAssignedKpe(pic)
  const shift = shiftFor(assignedKpe, eventCfg)
  const shiftClass = shift === 1 ? 'bg-shift-1' : shift === 2 ? 'bg-shift-2' : 'bg-ink-700'

  const subsDisplay = [
    ...(pic.substances || []).filter((s) => s !== 'Other'),
    ...(pic.substances?.includes('Other') && pic.substanceOther ? [pic.substanceOther] : []),
  ]
  const presDisplay = [
    ...(pic.presentations || []).filter((p) => p !== 'Other'),
    ...(pic.presentations?.includes('Other') && pic.presentationOther ? [pic.presentationOther] : []),
  ]

  const displayName = pic.name || pic.description || '— no name —'
  const picNum = pic.number ?? Number(pic.id?.replace('pic_', '')) // backwards-compat

  return (
    <button
      onClick={onClick}
      className={`w-full text-left panel p-4 hover:border-ink-600 transition group ${
        isDischarged ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <CodeBadge code={code} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-black text-lg tabular-nums text-ink-300">
              #{picNum}
            </span>
            <h3 className={`font-display font-bold text-lg truncate ${!pic.name ? 'text-ink-400 italic font-medium' : ''}`}>
              {displayName}
            </h3>
            <span className="text-xs font-display tabular-nums text-ink-400 ml-auto whitespace-nowrap">
              {formatClock(pic.enteredCare)} · {formatElapsed(elapsed)}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 ${shiftClass} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              {assignedKpe || (
                <span className="italic opacity-70">Unassigned</span>
              )}
            </span>
            {pic.gender && (
              <span className="text-xs text-ink-400">
                {pic.gender}
                {pic.ageRange ? ` · ${pic.ageRange}` : ''}
              </span>
            )}
          </div>

          {subsDisplay.length > 0 && (
            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] font-display tracking-[0.2em] uppercase text-ink-500 shrink-0">
                Subs
              </span>
              <div className="flex flex-wrap gap-1.5">
                {subsDisplay.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="text-xs bg-ink-800 border border-ink-700 rounded-md px-2 py-0.5 text-ink-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {presDisplay.length > 0 && (
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] font-display tracking-[0.2em] uppercase text-ink-500 shrink-0">
                Pres
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presDisplay.map((p, i) => (
                  <span
                    key={`${p}-${i}`}
                    className="text-xs bg-ink-800 border border-ink-700 rounded-md px-2 py-0.5 text-ink-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
