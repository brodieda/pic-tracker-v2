import { useState } from 'react'

/**
 * KpeChipPicker — inline chip picker (no modal).
 * Team 1 / Team 2 names as coloured chips, an optional Unassigned group
 * (KPE names in use but not on a team), plus a free-text input.
 *
 * Props:
 *  - currentKpe: string | null
 *  - shift1Team, shift2Team: string[]
 *  - unassigned?: string[]  (names in use but not rostered)
 *  - compact?: bool  (headerless single-row layout — used on the intake screen)
 *  - onSelect: (newKpeOrNull) => void
 *  - onDone?: () => void
 *  - allowClear?: bool (default true)
 *  - restrictTo?: string[] | null  (e.g. TL sign-off — hides unassigned)
 */
export default function KpeChipPicker({
  currentKpe,
  shift1Team,
  shift2Team,
  unassigned = [],
  compact = false,
  onSelect,
  onDone,
  allowClear = true,
  restrictTo = null,
  emptyHint = 'No KPEs configured. Type a name below.',
}) {
  const [custom, setCustom] = useState('')

  const handlePick = (name) => {
    onSelect(name)
    onDone?.()
  }
  const handleCustom = () => {
    const trimmed = custom.trim()
    if (!trimmed) return
    onSelect(trimmed)
    setCustom('')
    onDone?.()
  }
  const handleClear = () => {
    onSelect(null)
    onDone?.()
  }

  const restrictSet = restrictTo != null ? new Set(restrictTo) : null
  const shift1 = (shift1Team || []).filter((n) => !restrictSet || restrictSet.has(n))
  const shift2Only = (shift2Team || []).filter(
    (n) => !shift1.includes(n) && (!restrictSet || restrictSet.has(n))
  )
  // Unassigned only when not restricting (TL sign-off shows leads only).
  const unassignedList = restrictSet
    ? []
    : (unassigned || []).filter((n) => !shift1.includes(n) && !shift2Only.includes(n))

  const allEmpty = shift1.length === 0 && shift2Only.length === 0 && unassignedList.length === 0

  const chip = (name, kind) => {
    const active = name === currentKpe
    let cls
    if (kind === 't1')
      cls = active
        ? 'bg-shift-1 text-white border-white'
        : 'bg-shift-1/15 text-shift-1 border-shift-1/40 hover:bg-shift-1/30'
    else if (kind === 't2')
      cls = active
        ? 'bg-shift-2 text-white border-white'
        : 'bg-shift-2/15 text-shift-2 border-shift-2/40 hover:bg-shift-2/30'
    else
      cls = active
        ? 'bg-ink-100 text-ink-950 border-ink-100'
        : 'bg-ink-800 text-ink-300 border-ink-700 hover:border-ink-500'
    return (
      <button
        key={`${kind}-${name}`}
        type="button"
        onClick={() => handlePick(name)}
        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition border ${cls}`}
      >
        {name}
      </button>
    )
  }

  const group = (label, dotClass, chips) =>
    chips.length > 0 && (
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">{label}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">{chips}</div>
      </div>
    )

  const typeRow = (
    <div className="flex gap-2 items-center pt-1">
      <input
        className="input flex-1 text-sm"
        placeholder="Or type a name…"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCustom()
          if (e.key === 'Escape') onDone?.()
        }}
      />
      {custom.trim() && (
        <button type="button" onClick={handleCustom} className="btn-ghost text-sm shrink-0">
          Use
        </button>
      )}
      {allowClear && currentKpe && !custom.trim() && (
        <button type="button" onClick={handleClear} className="btn-ghost text-sm shrink-0">
          Clear
        </button>
      )}
    </div>
  )

  // Compact (intake): one flowing row, colour carries the grouping.
  if (compact) {
    return (
      <div className="space-y-2">
        {allEmpty ? (
          <p className="text-xs text-ink-500 italic">{emptyHint}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {shift1.map((n) => chip(n, 't1'))}
            {shift2Only.map((n) => chip(n, 't2'))}
            {unassignedList.map((n) => chip(n, 'un'))}
          </div>
        )}
        {typeRow}
      </div>
    )
  }

  // Default: labelled groups.
  return (
    <div className="space-y-3">
      {group('Team 1', 'bg-shift-1', shift1.map((n) => chip(n, 't1')))}
      {group('Team 2', 'bg-shift-2', shift2Only.map((n) => chip(n, 't2')))}
      {group('Unassigned', 'bg-ink-500', unassignedList.map((n) => chip(n, 'un')))}
      {allEmpty && <p className="text-xs text-ink-500 italic">{emptyHint}</p>}
      {typeRow}
    </div>
  )
}
