import {
  elapsedMinutes,
  formatElapsed,
  formatClock,
  currentCodeFor,
  shiftFor,
  getAssignedKpe,
  code3MonitorStateFor,
  normalizeReferredBy,
  normalizeReferredTo,
  workloadFor,
} from '../lib/helpers'
import { CODES } from '../constants/options'

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

function abbrevGender(g) {
  if (!g) return ''
  if (g === 'Feminine') return 'F'
  if (g === 'Masculine') return 'M'
  if (g === 'Non-binary') return 'NB'
  return g
}

// Workload dots — up to 4 dots, with a small "+" indicator beyond.
function WorkloadDots({ count }) {
  if (count <= 0) return null
  const visibleDots = Math.min(count, 4)
  const overflow = count > 4
  return (
    <div className="flex items-center gap-0.5 mt-1" title={`${count} PIC${count === 1 ? '' : 's'} in care`}>
      {Array.from({ length: visibleDots }).map((_, i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/85" />
      ))}
      {overflow && <span className="text-[10px] font-bold text-white/85 ml-0.5 leading-none">+</span>}
    </div>
  )
}

// Left-attached KPE tag. Tappable to open the KPE picker.
// Hosts the Mark Checked button below when a check is due/overdue.
function KpeTag({
  assignedKpe,
  shiftClass,
  workload,
  showCheckButton,
  monitorState,
  onTap,
  onMarkChecked,
}) {
  const isUnassigned = !assignedKpe

  // Width is fixed-ish for visual rhythm down a column of cards
  const baseClasses = 'w-20 sm:w-24 shrink-0 flex flex-col items-center justify-center px-2 py-2.5 rounded-l-xl text-center'

  const colorClasses = isUnassigned
    ? 'bg-ink-800 border border-dashed border-ink-600 text-ink-400'
    : `${shiftClass} text-white`

  return (
    <div className="flex flex-col items-stretch shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onTap?.()
        }}
        className={`${baseClasses} ${colorClasses} hover:opacity-90 transition`}
      >
        <span className={`font-display font-bold text-sm leading-tight truncate max-w-full ${isUnassigned ? 'italic font-medium' : ''}`}>
          {assignedKpe || 'Unassigned'}
        </span>
        {!isUnassigned && <WorkloadDots count={workload} />}
      </button>

      {showCheckButton && onMarkChecked && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMarkChecked()
          }}
          className={`mt-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border transition shadow ${
            monitorState === 'overdue'
              ? 'bg-code-1 border-code-1 text-white hover:opacity-90'
              : 'bg-code-3 border-code-3 text-ink-950 hover:opacity-90'
          }`}
        >
          Mark checked
        </button>
      )}
    </div>
  )
}

export default function PicCard({ pic, events, eventCfg, allPics, onClick, onMarkChecked, onTapKpe }) {
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

  const referredByList = normalizeReferredBy(pic)
  const referredByDisplay = [
    ...referredByList.filter((s) => s !== 'Other'),
    ...(referredByList.includes('Other') && pic.referredByOther ? [pic.referredByOther] : []),
  ]

  const referredToList = normalizeReferredTo(pic)
  const referredToDisplay = [
    ...referredToList.filter((s) => s !== 'Other'),
    ...(referredToList.includes('Other') && pic.referredToOther ? [pic.referredToOther] : []),
  ]

  const outcomeDisplay = pic.outcome === 'Other' ? pic.outcomeOther || 'Other' : pic.outcome
  const displayName = pic.name || pic.description || '— no name —'
  const picNum = pic.number ?? Number(pic.id?.replace('pic_', ''))

  const monitorState = !isDischarged ? code3MonitorStateFor(pic.id, events, eventCfg) : null
  const showCheckButton = monitorState === 'overdue' || monitorState === 'due_soon'

  let timeColor = 'text-ink-400'
  if (monitorState === 'overdue') timeColor = 'text-code-1 font-bold'
  else if (monitorState === 'due_soon') timeColor = 'text-code-3 font-semibold'

  // Card-level border / glow
  let borderClass = 'border-ink-800'
  if (monitorState === 'overdue') borderClass = 'border-code-1 ring-2 ring-code-1/40'
  else if (monitorState === 'due_soon') borderClass = 'border-code-3 ring-1 ring-code-3/30'
  else if (code === 2 && !isDischarged) borderClass = 'border-code-2/60'

  const demogParts = []
  if (pic.gender) demogParts.push(abbrevGender(pic.gender))
  if (pic.ageRange) demogParts.push(pic.ageRange)
  const demog = demogParts.join(' ')

  const showDescriptionInline = !!(pic.description && pic.name)
  const hasSubs = subsDisplay.length > 0
  const hasPres = presDisplay.length > 0
  const hasRefBy = referredByDisplay.length > 0

  const workload = !isDischarged ? workloadFor(assignedKpe, allPics) : 0

  return (
    <div className={`flex items-stretch bg-ink-900 border rounded-xl transition group overflow-hidden ${borderClass} ${isDischarged ? 'opacity-75' : ''}`}>
      {/* Left: KPE tag */}
      <KpeTag
        assignedKpe={assignedKpe}
        shiftClass={shiftClass}
        workload={workload}
        showCheckButton={showCheckButton}
        monitorState={monitorState}
        onTap={() => onTapKpe?.(pic)}
        onMarkChecked={() => onMarkChecked?.(pic)}
      />

      {/* Right: rest of card content (clickable to open detail) */}
      <button onClick={onClick} className="flex-1 min-w-0 text-left px-3.5 py-2.5">
        {/* Row 1: PIC# + name + description + gender/age | code + time */}
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
            <span className="font-display font-black text-xl tabular-nums text-ink-100 shrink-0 leading-none">
              #{picNum}
            </span>
            <h3
              className={`font-display font-bold text-base leading-tight truncate max-w-full ${
                !pic.name ? 'text-ink-400 italic font-medium' : 'text-ink-100'
              }`}
            >
              {displayName}
            </h3>
            {showDescriptionInline && (
              <span className="text-xs text-ink-400 italic truncate min-w-0">
                · {pic.description}
              </span>
            )}
            {demog && (
              <span className="text-[11px] text-ink-500 shrink-0">· {demog}</span>
            )}
          </div>

          <div className="flex items-start gap-2 shrink-0">
            <CodePill code={code} />
            <span className={`text-xs font-display tabular-nums whitespace-nowrap leading-none pt-1.5 ${timeColor}`}>
              {isDischarged ? (
                <>
                  <span className="text-ink-500">in</span> {formatClock(pic.enteredCare)}
                  <span className="text-ink-600 mx-1">→</span>
                  <span className="text-ink-500">out</span> {formatClock(pic.leftCare)}
                </>
              ) : (
                <>
                  {formatClock(pic.enteredCare)}
                  <span className={timeColor === 'text-ink-400' ? 'text-ink-500' : 'opacity-80'}>
                    {' '}· {formatElapsed(elapsed)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Row 2: referred-by + MH + subs + pres (in-care)  OR  outcome + medical + ref-to (discharged) */}
        {(hasRefBy || (code === 2 && !isDischarged) || hasSubs || hasPres ||
          (isDischarged && (outcomeDisplay || referredToDisplay.length > 0 || pic.medicalInvolved === true))) && (
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap text-xs leading-snug">
            {/* In-care: referred by appears first — biographical info */}
            {!isDischarged && hasRefBy && (
              <span className="text-ink-200">
                <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                  Ref by
                </span>
                {referredByDisplay.join(', ')}
              </span>
            )}

            {/* MH badge for in-care Code 2 */}
            {code === 2 && !isDischarged && (
              <>
                {hasRefBy && <span className="text-ink-700">·</span>}
                <span className="inline-flex items-center gap-1 bg-code-2/15 border border-code-2/50 text-code-2 text-[10px] font-display font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0">
                  ⚑ MH
                </span>
              </>
            )}

            {/* Subs */}
            {!isDischarged && hasSubs && (
              <>
                {(hasRefBy || code === 2) && <span className="text-ink-700">·</span>}
                <span className="text-ink-200">
                  <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                    Subs
                  </span>
                  {subsDisplay.join(', ')}
                </span>
              </>
            )}

            {/* Pres */}
            {!isDischarged && hasPres && (
              <>
                {(hasRefBy || code === 2 || hasSubs) && <span className="text-ink-700">·</span>}
                <span className="text-ink-200">
                  <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                    Pres
                  </span>
                  {presDisplay.join(', ')}
                </span>
              </>
            )}

            {/* Discharged: outcome + medical + ref-to */}
            {isDischarged && outcomeDisplay && (
              <span className="text-ink-200">
                <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                  Out
                </span>
                <span className="font-semibold">{outcomeDisplay}</span>
              </span>
            )}
            {isDischarged && pic.medicalInvolved === true && (
              <>
                {outcomeDisplay && <span className="text-ink-700">·</span>}
                <span className="text-[10px] bg-code-1/20 border border-code-1/40 text-code-1 rounded px-1.5 py-0.5 font-bold uppercase tracking-widest shrink-0">
                  Medical
                </span>
              </>
            )}
            {isDischarged && referredToDisplay.length > 0 && (
              <>
                {(outcomeDisplay || pic.medicalInvolved === true) && <span className="text-ink-700">·</span>}
                <span className="text-ink-200">
                  <span className="text-[10px] font-display tracking-[0.18em] uppercase text-ink-500 mr-1.5">
                    Ref to
                  </span>
                  {referredToDisplay.join(', ')}
                </span>
              </>
            )}
          </div>
        )}
      </button>
    </div>
  )
}
