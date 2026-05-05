import { useState } from 'react'

/**
 * KpeChipPicker — inline chip picker (no modal).
 * Renders shift 1 and shift 2 names as coloured chips, plus a small free-text input.
 *
 * Props:
 *  - currentKpe: string | null
 *  - shift1Team: string[]
 *  - shift2Team: string[]
 *  - onSelect: (newKpeOrNull) => void
 *  - onDone?: () => void  (collapse parent's edit mode)
 *  - allowClear?: bool (default true)
 */
export default function KpeChipPicker({
  currentKpe,
  shift1Team,
  shift2Team,
  onSelect,
  onDone,
  allowClear = true,
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

  const shift1 = shift1Team || []
  const shift2Only = (shift2Team || []).filter((n) => !shift1.includes(n))

  return (
    <div className="space-y-3">
      {shift1.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-shift-1" />
            <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
              Shift 1
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shift1.map((name) => {
              const active = name === currentKpe
              return (
                <button
                  key={`s1-${name}`}
                  onClick={() => handlePick(name)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition border ${
                    active
                      ? 'bg-shift-1 text-white border-white'
                      : 'bg-shift-1/15 text-shift-1 border-shift-1/40 hover:bg-shift-1/30'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {shift2Only.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-shift-2" />
            <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
              Shift 2
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shift2Only.map((name) => {
              const active = name === currentKpe
              return (
                <button
                  key={`s2-${name}`}
                  onClick={() => handlePick(name)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition border ${
                    active
                      ? 'bg-shift-2 text-white border-white'
                      : 'bg-shift-2/15 text-shift-2 border-shift-2/40 hover:bg-shift-2/30'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {shift1.length === 0 && shift2Only.length === 0 && (
        <p className="text-xs text-ink-500 italic">
          No KPEs configured. Type a name below.
        </p>
      )}

      <div className="flex gap-2 items-center pt-1">
        <input
          className="input flex-1 text-sm"
          placeholder="Or type a custom name…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCustom()
            if (e.key === 'Escape') onDone?.()
          }}
        />
        {custom.trim() && (
          <button onClick={handleCustom} className="btn-ghost text-sm shrink-0">
            Use
          </button>
        )}
        {allowClear && currentKpe && !custom.trim() && (
          <button onClick={handleClear} className="btn-ghost text-sm shrink-0">
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
