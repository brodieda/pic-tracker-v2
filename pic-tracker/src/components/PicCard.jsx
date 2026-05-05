import CodeBadge from './CodeBadge'
import {
  elapsedMinutes,
  formatElapsed,
  formatClock,
  currentCodeFor,
  shiftFor,
  getAssignedKpe,
  code3MonitorStateFor,
  minutesSinceLastActivity,
} from '../lib/helpers'

export default function PicCard({ pic, events, eventCfg, onClick, onMarkChecked }) {
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
  const picNum = pic.number ?? Number(pic.id?.replace('pic_', ''))

  // Monitoring states
  const monitorState = !isDischarged ? code3MonitorStateFor(pic.id, events, eventCfg) : null
  const minsSince = !isDischarged ? minutesSinceLastActivity(pic.id, events) : null

  // Card border based on state
  let borderClass = 'border-ink-800'
  if (monitorState === 'overdue') borderClass = 'border-code-1 ring-2 ring-code-1/40'
  else if (monitorState === 'due_soon') borderClass = 'border-code-3 ring-1 ring-code-3/30'
  else if (code === 2 && !isDischarged) borderClass = 'border-code-2/60'

  return (
    <div
      className={`w-full text-left bg-ink-900 border rounded-xl transition group ${borderClass} ${
        isDischarged ? 'opacity-70' : ''
      }`}
    >
      <button onClick={onClick} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <CodeBadge code={code} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-lg tabular-nums text-ink-300">
                #{picNum}
              </span>
              <h3
                className={`font-display font-bold text-lg truncate ${
                  !pic.name ? 'text-ink-400 italic font-medium' : ''
                }`}
              >
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
                {assignedKpe || <span className="italic opacity-70">Unassigned</span>}
              </span>
              {code === 2 && !isDischarged && (
                <span className="inline-flex items-center gap-1 bg-code-2/15 border border-code-2/50 text-code-2 text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                  ⚑ MH watch
                </span>
              )}
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

      {/* Monitoring footer */}
      {monitorState && (
        <div
          className={`flex items-center gap-2 px-4 py-2 border-t text-xs font-display tabular-nums ${
            monitorState === 'overdue'
              ? 'border-code-1/40 bg-code-1/10 text-code-1'
              : monitorState === 'due_soon'
              ? 'border-code-3/40 bg-code-3/10 text-code-3'
              : 'border-ink-800 text-ink-400'
          }`}
        >
          <span className="font-bold uppercase tracking-widest">
            {monitorState === 'overdue'
              ? '⚠ Check overdue'
              : monitorState === 'due_soon'
              ? 'Check due soon'
              : 'Last checked'}
          </span>
          <span>
            {minsSince != null ? `${minsSince}m ago` : '—'}
          </span>
          {(monitorState === 'overdue' || monitorState === 'due_soon') && onMarkChecked && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkChecked(pic)
              }}
              className={`ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border transition ${
                monitorState === 'overdue'
                  ? 'bg-code-1 border-code-1 text-white hover:opacity-90'
                  : 'bg-code-3 border-code-3 text-ink-950 hover:opacity-90'
              }`}
            >
              Mark checked
            </button>
          )}
        </div>
      )}
    </div>
  )
}
