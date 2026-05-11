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
  wasEverCode2,
} from '../lib/helpers'
import { completenessFor } from '../lib/completeness'
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

// KPE pill with workload dots inside. Tappable to open KPE picker.
// 1-3 PICs: that many dots. 4+: three dots + a '+'.
function KpePill({ assignedKpe, shiftClass, workload, onTap }) {
  const isUnassigned = !assignedKpe
  const colorClasses = isUnassigned
    ? 'bg-ink-800 border border-dashed border-ink-600 text-ink-400'
    : `${shiftClass} text-white`

  const visibleDots = Math.min(workload, 3)
  const overflow = workload > 3

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onTap?.()
      }}
      className={`inline-flex items-center gap-1.5 ${colorClasses} text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 hover:opacity-90 transition`}
    >
      <span className={isUnassigned ? 'italic font-medium' : ''}>
        {assignedKpe || 'Unassigned'}
      </span>
      {!isUnassigned && workload > 0 && (
        <span className="flex items-center gap-0.5" title={`${workload} PIC${workload === 1 ? '' : 's'} in care`}>
          {Array.from({ length: visibleDots }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-white/85" />
          ))}
          {overflow && <span className="text-[10px] font-bold leading-none ml-0.5">+</span>}
        </span>
      )}
    </button>
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

  const { complete, missing } = completenessFor(pic)

  const monitorState = !isDischarged ? code3MonitorStateFor(pic.id, events, eventCfg) : null
  const showCheckButton = monitorState === 'overdue' || monitorState === 'due_soon'

  // Persistent MH flag — set if PIC was ever Code 2 during this episode
  const everCode2 = wasEverCode2(pic.id, events)

  let timeColor = 'text-ink-400'
  if (monitorState === 'overdue') timeColor = 'text-code-1 font-bold'
  else if (monitorState === 'due_soon') timeColor = 'text-code-3 font-semibold'

  // Card border: overdue red ring > due-soon yellow ring > MH (any time at code 2) orange tint
  let borderClass = 'border-ink-800'
  if (monitorState === 'overdue') borderClass = 'border-code-1 ring-2 ring-code-1/40'
  else if (monitorState === 'due_soon') borderClass = 'border-code-3 ring-1 ring-code-3/30'
  else if (everCode2 && !isDischarged) borderClass = 'border-code-2/60'

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
    <div className={`bg-ink-900 border rounded-xl transition group overflow-hidden ${borderClass} ${isDischarged ? 'opacity-75' : ''}`}>
      <button onClick={onClick} className="w-full text-left px-3.5 py-2.5">
        {/* Row 1: PIC# + name + description + gender/age | MH + code + time + (mark checked) */}
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
            <span className="font-display font-black text-xl tabular-nums text-ink-100 shrink-0 leading-none">
              #{picNum}
            </span>
            {!complete && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-code-3 text-ink-950 text-[10px] font-display font-black shrink-0 leading-none"
                title={`Missing: ${missing.join(', ')}`}
              >
                !
              </span>
            )}
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
            {pic.gender && (
              <span className="tag shrink-0">{abbrevGender(pic.gender)}</span>
            )}
            {pic.ageRange && (
              <span className="tag shrink-0">{pic.ageRange}</span>
            )}
          </div>

          {/* Right cluster: MH (if ever) + code pill + time stack with optional mark-checked button */}
          <div className="flex items-start gap-2 shrink-0">
            {everCode2 && !isDischarged && (
              <span
                className="inline-flex items-center gap-1 bg-code-2/15 border border-code-2/50 text-code-2 text-[10px] font-display font-bold uppercase tracking-widest px-1.5 h-7 rounded-md shrink-0"
                title="Has been Code 2 (mental health) at some point this episode"
              >
                ⚑ MH
              </span>
            )}
            <CodePill code={code} />
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`text-sm font-display font-semibold tabular-nums whitespace-nowrap leading-none pt-1.5 ${timeColor}`}>
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
              {showCheckButton && onMarkChecked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkChecked(pic)
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border transition shadow ${
                    monitorState === 'overdue'
                      ? 'bg-code-1 border-code-1 text-white hover:opacity-90'
                      : 'bg-code-3 border-code-3 text-ink-950 hover:opacity-90'
                  }`}
                >
                  Mark checked
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: KPE pill + ref-by + subs + pres (in-care)  OR  outcome + medical + ref-to (discharged) */}
        {(assignedKpe != null || hasRefBy || hasSubs || hasPres ||
          (isDischarged && (outcomeDisplay || referredToDisplay.length > 0 || pic.medicalInvolved === true))) && (
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap text-xs leading-snug">
            {/* KPE pill always first if there's any second-row content */}
            <KpePill
              assignedKpe={assignedKpe}
              shiftClass={shiftClass}
              workload={workload}
              onTap={() => onTapKpe?.(pic)}
            />

            {/* In-care: ref by + subs + pres */}
            {!isDischarged && hasRefBy && (
              <>
                <span className="text-ink-700">·</span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-ink-500 mr-1">
                    Ref by
                  </span>
                  {referredByDisplay.map((v, i) => (
                    <span key={i} className="tag">{v}</span>
                  ))}
                </span>
              </>
            )}
            {!isDischarged && hasSubs && (
              <>
                <span className="text-ink-700">·</span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-ink-500 mr-1">
                    Subs
                  </span>
                  {subsDisplay.map((v, i) => (
                    <span key={i} className="tag">{v}</span>
                  ))}
                </span>
              </>
            )}
            {!isDischarged && hasPres && (
              <>
                <span className="text-ink-700">·</span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-ink-500 mr-1">
                    Pres
                  </span>
                  {presDisplay.map((v, i) => (
                    <span key={i} className="tag">{v}</span>
                  ))}
                </span>
              </>
            )}

            {/* Discharged: outcome + medical + ref-to */}
            {isDischarged && outcomeDisplay && (
              <>
                <span className="text-ink-700">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-ink-500 mr-1">
                    Out
                  </span>
                  <span className="tag">{outcomeDisplay}</span>
                </span>
              </>
            )}
            {isDischarged && pic.medicalInvolved === true && (
              <>
                <span className="text-ink-700">·</span>
                <span className="text-[10px] bg-code-1/20 border border-code-1/40 text-code-1 rounded px-1.5 py-0.5 font-bold uppercase tracking-widest shrink-0">
                  Medical
                </span>
              </>
            )}
            {isDischarged && referredToDisplay.length > 0 && (
              <>
                <span className="text-ink-700">·</span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-ink-500 mr-1">
                    Ref to
                  </span>
                  {referredToDisplay.map((v, i) => (
                    <span key={i} className="tag">{v}</span>
                  ))}
                </span>
              </>
            )}
          </div>
        )}
      </button>
    </div>
  )
}
