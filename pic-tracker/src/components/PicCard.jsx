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
import { CODES, referralTagClass } from '../constants/options'
import ShieldIcon from './ShieldIcon'

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

  // Card border stays neutral for welfare-check states — the red/bold time and
  // the solid "Mark checked" button carry the signal instead of a whole-card ring.
  // Only the persistent MH tint (ever Code 2) still colours the border.
  let borderClass = 'border-ink-800'
  if (everCode2 && !isDischarged) borderClass = 'border-code-2/60'

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
    <div className={`bg-ink-900 border rounded-xl transition ${borderClass} ${isDischarged ? 'opacity-75' : ''}`}>
      <button onClick={onClick} className="w-full text-left px-3 py-2.5 flex items-center gap-3">
        <CodePill code={code} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-display font-black text-lg tabular-nums text-ink-100 shrink-0 leading-none">
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
              className={`font-display font-bold text-base leading-tight truncate ${
                !pic.name ? 'text-ink-400 italic font-medium' : 'text-ink-100'
              }`}
            >
              {displayName}
            </h3>
            {everCode2 && !isDischarged && (
              <span className="text-code-2 shrink-0 leading-none" title="Has been Code 2 (mental health) this episode">
                ⚑
              </span>
            )}
            {pic.ejectionFlag && (
              <span
                className="secflag-on inline-flex items-center rounded px-1 py-0.5 shrink-0"
                title="Security Flag — RSA/Security to be notified before discharge"
              >
                <ShieldIcon className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1 text-xs min-w-0">
            {assignedKpe ? (
              <>
                <span className={`w-2 h-2 rounded-full shrink-0 ${shiftClass}`} />
                <span className="text-ink-300 truncate">{assignedKpe}</span>
              </>
            ) : (
              <span className="text-ink-600 italic">Unassigned</span>
            )}
          </div>
        </div>

        <span className={`text-sm font-display font-semibold tabular-nums whitespace-nowrap shrink-0 ${timeColor}`}>
          {formatElapsed(elapsed)}
        </span>
      </button>
    </div>
  )
}
