import { useState } from 'react'

/**
 * RosterField — list of names with add input + remove on chip.
 * Props:
 *  - names: string[]
 *  - onChange: (names) => void
 *  - accentClass: tailwind class for chip accent (e.g. 'bg-shift-1')
 *  - placeholder: string
 *  - tlNames?: string[]            names currently flagged as Team Lead
 *  - onToggleTl?: (name) => void   toggle a name's TL status (enables the TL pip)
 */
export default function RosterField({
  names,
  onChange,
  accentClass = 'bg-ink-700',
  placeholder = 'Add name…',
  tlNames = null,
  onToggleTl = null,
}) {
  const [draft, setDraft] = useState('')
  const tlEnabled = !!onToggleTl
  const isTl = (n) => Array.isArray(tlNames) && tlNames.includes(n)

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (names.includes(trimmed)) {
      setDraft('')
      return
    }
    onChange([...names, trimmed])
    setDraft('')
  }

  const remove = (name) => {
    onChange(names.filter((n) => n !== name))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {names.length === 0 && (
          <span className="text-ink-500 text-sm italic">No one added yet</span>
        )}
        {names.map((n) => (
          <span
            key={n}
            className={`inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-1.5 py-1 text-sm font-medium text-white ${accentClass}`}
          >
            {tlEnabled && (
              <button
                type="button"
                onClick={() => onToggleTl(n)}
                aria-pressed={isTl(n)}
                title={isTl(n) ? `${n} is a Team Lead — tap to unset` : `Mark ${n} as Team Lead`}
                className={`inline-flex items-center justify-center h-6 px-1.5 rounded-full text-[10px] font-display font-black tracking-wider leading-none transition ${
                  isTl(n)
                    ? 'bg-amber-400 text-ink-950'
                    : 'bg-black/25 text-white/70 hover:bg-black/40 hover:text-white'
                }`}
              >
                TL
              </button>
            )}
            <span className={tlEnabled ? '' : 'pl-1.5'}>{n}</span>
            <button
              type="button"
              onClick={() => remove(n)}
              className="rounded-full w-6 h-6 inline-flex items-center justify-center bg-black/25 hover:bg-black/45 text-white text-xs leading-none"
              aria-label={`Remove ${n}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className="btn-ghost" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  )
}
