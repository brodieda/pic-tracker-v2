import { useState } from 'react'

/**
 * RosterField — list of names with add input + remove on chip.
 * Props:
 *  - names: string[]
 *  - onChange: (names) => void
 *  - accentClass: tailwind class for chip accent (e.g. 'bg-shift-1')
 *  - placeholder: string
 */
export default function RosterField({ names, onChange, accentClass = 'bg-ink-700', placeholder = 'Add name…' }) {
  const [draft, setDraft] = useState('')

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
            className={`inline-flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1 text-sm font-medium text-white ${accentClass}`}
          >
            {n}
            <button
              type="button"
              onClick={() => remove(n)}
              className="rounded-full w-5 h-5 inline-flex items-center justify-center bg-black/25 hover:bg-black/45 text-white text-xs leading-none"
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
