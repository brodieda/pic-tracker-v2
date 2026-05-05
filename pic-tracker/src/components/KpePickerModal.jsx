import { useState } from 'react'

/**
 * KpePickerModal — modal with chips for each KPE name.
 * Shift 1 chips coloured teal, shift 2 chips coloured purple.
 * Also has a free-text input + "Clear" button.
 *
 * Props:
 *  - open: bool
 *  - currentKpe: string | null
 *  - shift1Team: string[]
 *  - shift2Team: string[]
 *  - onSelect: (newKpeOrNull) => void
 *  - onClose: () => void
 */
export default function KpePickerModal({ open, currentKpe, shift1Team, shift2Team, onSelect, onClose }) {
  const [custom, setCustom] = useState('')

  if (!open) return null

  const handlePick = (name) => {
    onSelect(name)
    onClose()
  }

  const handleCustom = () => {
    const trimmed = custom.trim()
    if (!trimmed) return
    onSelect(trimmed)
    setCustom('')
    onClose()
  }

  const handleClear = () => {
    onSelect(null)
    onClose()
  }

  // Names on both shifts get rendered once in shift 1 to avoid duplicates
  const shift2Only = (shift2Team || []).filter((n) => !(shift1Team || []).includes(n))

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-ink-950 border border-ink-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-800 flex items-center gap-3">
          <div>
            <p className="text-[10px] font-display tracking-[0.3em] uppercase text-ink-500">/ assign kpe</p>
            <h3 className="font-display font-bold text-lg">Choose KPE</h3>
          </div>
          {currentKpe && (
            <span className="ml-auto text-xs text-ink-400">
              Current: <span className="text-ink-100 font-semibold">{currentKpe}</span>
            </span>
          )}
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {(shift1Team || []).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-shift-1" />
                <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
                  Shift 1
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shift1Team.map((name) => {
                  const active = name === currentKpe
                  return (
                    <button
                      key={`s1-${name}`}
                      onClick={() => handlePick(name)}
                      className={`px-3.5 py-2 rounded-full text-sm font-semibold transition border-2 ${
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
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-shift-2" />
                <span className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400">
                  Shift 2
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shift2Only.map((name) => {
                  const active = name === currentKpe
                  return (
                    <button
                      key={`s2-${name}`}
                      onClick={() => handlePick(name)}
                      className={`px-3.5 py-2 rounded-full text-sm font-semibold transition border-2 ${
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

          {(shift1Team || []).length === 0 && shift2Only.length === 0 && (
            <p className="text-sm text-ink-500 italic">
              No KPEs configured. Add rosters in Settings, or type a custom name below.
            </p>
          )}

          <div className="pt-3 border-t border-ink-800">
            <label className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2 block">
              Custom name
            </label>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Type a name not on the rosters…"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustom()
                }}
              />
              <button onClick={handleCustom} className="btn-ghost" disabled={!custom.trim()}>
                Use
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-ink-800 px-5 py-3 flex items-center gap-2">
          <button onClick={handleClear} className="btn-ghost text-sm">
            Clear assignment
          </button>
          <button onClick={onClose} className="btn-ghost ml-auto">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
