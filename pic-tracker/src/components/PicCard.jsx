import {
  elapsedMinutes,
  formatElapsed,
  formatClock,
  currentCodeFor,
  shiftFor,
  getAssignedKpe,
  code3MonitorStateFor,
  minutesSinceLastActivity,
  normalizeReferredTo,
} from '../lib/helpers'
import { CODES } from '../constants/options'

// Compact code pill — small, colour-coded indicator.
function CodePill({ code }) {
  if (code == null) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-ink-800 border border-ink-700 text-ink-500 font-display font-bold text-xs">
        —
      </span>
    )
  }
  const cfg = CODES.find((c) => c.code === code)
  const tone = code === 3 ? 'text-ink-950' : 'text-white'
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${cfg.tw} ${tone} font-display font-bold text-sm shadow-sm shrink-0`}
      title={cfg.label}
    >
      {code}
    </span>
  )
}

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

  const referredToList = normalizeReferredTo(pic)
  const referredToDisplay = [
    ...referredToList.filter((s) => s !== 'Other'),
    ...(referredToList.includes('Other') && pic.referredToOther ? [pic.referredToOther] : []),
  ]

  const outcomeDisplay = pic.outcome === 'Other' ? pic.outcomeOther || 'Other' : pic.outcome

  const displayName = pic.name || pic.description || '— no name —'
  const picNum = pic.number ?? Number(pic.id?.replace('pic_', ''))

  // Monitoring states (in-care only)
  const monitorState = !isDischarged ? code3MonitorStateFor(pic.id, events, eventCfg) : null
  const minsSince = !isDischarged ? minutesSinceLastActivity(pic.id, events) : null

  let borderClass = 'border-ink-800'
  if (monitorState === 'overdue') borderClass = 'border-code-1 ring-2 ring-code-1/40'
  else if (monitorState === 'due_soon') borderClass = 'border-code-3 ring-1 ring-code-3/30'
  else if (code === 2 && !isDischarged) borderClass = 'border-code-2/60'

  // Combined subs + pres into a single line.
  // Format: "MDMA, LSD · Anxiety, Vomiting" — substances on left, presentations on right.
  const hasSubs = subsDisplay.length > 0
  const hasPres = presDisplay.length > 0

  return (
    <div
      className={`w-full text-left bg-ink-900 border rounded-xl transition group ${borderClass} ${
        isDischarged ? 'opacity-75' : ''
      }`}
    >
      <button onClick={onClick} className="w-full text-left px-3.5 py-2.5">
        {/* Top row: PIC # | Name | Code | Time */}
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-black text-xl tabular-nums text-ink-100 shrink-0 leading-none">
            #{picNum}
          </span>
          <h3
            className={`font-display font-bold text-base truncate flex-1 min-w-0 leading-tight ${
              !pic.name ? 'text-ink-400 italic font-medium' : 'text-ink-100'
            }`}
          >
            {displayName}
          </h3>
          <CodePill code={code} />
          <span className="text-xs font-display tabular-nums text-ink-400 whitespace-nowrap shrink-0 leading-none">
            {isDischarged ? (
              <>
                <span className="text-ink-500">in</span> {formatClock(pic.enteredCare)}
                <span className="text-ink-600 mx-1">→</span>
                <span className="text-ink-500">out</span> {formatClock(pic.leftCare)}
              </>
            ) : (
              <>
                {formatClock(pic.enteredCare)}
                <span className="text-ink-500"> · {formatElapsed(elapsed)}</span>
              </>
            )}
          </span>
        </div>

        {/* Description (in-care only — helps scanning the space) */}
        {!isDischarged && pic.description && pic.name && (
          <p className="mt-1 text-xs text-ink-400 italic truncate">
            {pic.description}
          </p>
        )}

        {/* KPE pill + alerts row + demographics — all on one line */}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 ${shiftClass} text-white text-[11px] font-semibold px-2 py-0.5 rounded-full`}
          >
            <span className="w-1 h-1 rounded-full bg-white/80" />
            {assignedKpe || <span className="italic opacity-70">Unassigned</span>}
          </span>
          {code === 2 && !isDischarged && (
            <span className="inline-flex items-center gap-1 bg-code-2/15 border border-code-2/50 text-code-2 text-[10px] font-display font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full">
              ⚑ MH
            </span>
          )}
          {pic.gender && (
            <span className="text-[11px] text-ink-500">
              {pic.gender}
              {pic.ageRange ? ` · ${pic.ageRange}` : ''}
            </span>
          )}
        </div>

        {/* In-care: subs + pres on a single line */}
        {!isDischarged && (hasSubs || hasPres) && (
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap text-xs leading-snug">
            {hasSubs && (
              <span className="text-ink-200">
                <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                  Subs
                </span>
                {subsDisplay.join(', ')}
              </span>
            )}
            {hasSubs && hasPres && <span className="text-ink-700">·</span>}
            {hasPres && (
              <span className="text-ink-200">
                <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                  Pres
                </span>
                {presDisplay.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Discharged: outcome + referred-to on single line */}
        {isDischarged && (outcomeDisplay || referredToDisplay.length > 0 || pic.medicalInvolved === true) && (
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap text-xs leading-snug">
            {outcomeDisplay && (
              <span className="text-ink-200">
                <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                  Out
                </span>
                <span className="font-semibold">{outcomeDisplay}</span>
              </span>
            )}
            {pic.medicalInvolved === true && (
              <span className="text-[10px] bg-code-1/20 border border-code-1/40 text-code-1 rounded px-1.5 py-0.5 font-bold uppercase tracking-widest">
                Medical
              </span>
            )}
            {(outcomeDisplay || pic.medicalInvolved === true) && referredToDisplay.length > 0 && (
              <span className="text-ink-700">·</span>
            )}
            {referredToDisplay.length > 0 && (
              <span className="text-ink-200">
                <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                  Ref
                </span>
                {referredToDisplay.join(', ')}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Monitoring footer — in-care only */}
      {monitorState && (
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 border-t text-xs font-display tabular-nums ${
            monitorState === 'overdue'
              ? 'border-code-1/40 bg-code-1/10 text-code-1'
              : monitorState === 'due_soon'
              ? 'border-code-3/40 bg-code-3/10 text-code-3'
              : 'border-ink-800 text-ink-400'
          }`}
        >
          <span className="font-bold uppercase tracking-widest text-[11px]">
            {monitorState === 'overdue'
              ? '⚠ Check overdue'
              : monitorState === 'due_soon'
              ? 'Check due soon'
              : 'Last checked'}
          </span>
          <span className="text-[11px]">{minsSince != null ? `${minsSince}m ago` : '—'}</span>
          {(monitorState === 'overdue' || monitorState === 'due_soon') && onMarkChecked && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkChecked(pic)
              }}
              className={`ml-auto px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest border transition ${
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
