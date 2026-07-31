import { useEffect, useRef, useState } from 'react'

/**
 * KpeDropdownPicker — closed-button dropdown for the intake screen.
 * Closed state shows a team-coloured dot + the selected name (or "Unassigned").
 * Open state is a searchable list — typing filters live; if nothing matches,
 * pressing Enter (or clicking the prompt) adds the typed text as a new name.
 *
 * Props:
 *  - value: string  (current selection, '' = unassigned)
 *  - shift1Team, shift2Team: string[]
 *  - unassigned?: string[]  (names in use but not rostered)
 *  - onSelect: (name: string) => void   // '' clears to Unassigned
 *  - emptyHint?: string  (shown when there's no roster at all yet)
 */
export default function KpeDropdownPicker({
  value,
  shift1Team = [],
  shift2Team = [],
  unassigned = [],
  onSelect,
  emptyHint = 'No KPEs configured yet — add rosters in Settings.',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef(null)
  const searchRef = useRef(null)

  const shift1 = shift1Team
  const shift2Only = shift2Team.filter((n) => !shift1.includes(n))
  const unassignedList = (unassigned || []).filter(
    (n) => !shift1.includes(n) && !shift2Only.includes(n),
  )
  const allEmpty = shift1.length === 0 && shift2Only.length === 0 && unassignedList.length === 0

  const all = [
    ...shift1.map((n) => ({ name: n, tag: 't1' })),
    ...shift2Only.map((n) => ({ name: n, tag: 't2' })),
    ...unassignedList.map((n) => ({ name: n, tag: 'un' })),
  ]

  const q = query.trim().toLowerCase()
  const filtered = q ? all.filter((o) => o.name.toLowerCase().includes(q)) : all

  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const pick = (name) => {
    onSelect(name)
    setOpen(false)
  }

  const dotClass = (tag) =>
    tag === 't1' ? 'bg-shift-1' : tag === 't2' ? 'bg-shift-2' : 'bg-ink-500'

  const selectedTag = all.find((o) => o.name === value)?.tag

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 input text-left font-semibold"
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${value ? dotClass(selectedTag) : 'bg-ink-700'}`} />
        <span className={value ? '' : 'text-ink-500 font-normal'}>{value || 'Unassigned'}</span>
        <span className="ml-auto text-ink-500 text-xs">▾</span>
      </button>

      {open && (
        <div
          className="dropdown-panel absolute z-20 mt-1.5 w-full bg-ink-900 border border-ink-700 rounded-lg shadow-2xl p-1.5"
          style={{ '--panel-origin': 'top' }}
        >
          <input
            ref={searchRef}
            className="input text-sm mb-1.5"
            placeholder="Search or type a new name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
              if (e.key === 'Enter' && filtered.length === 0 && query.trim()) {
                pick(query.trim())
              }
            }}
          />
          <div className="max-h-52 overflow-y-auto">
            <div
              onClick={() => pick('')}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-semibold text-ink-400 hover:bg-ink-800 cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-ink-700 shrink-0" />
              Unassigned
            </div>
            {allEmpty && <p className="text-xs text-ink-500 italic px-2.5 py-2">{emptyHint}</p>}
            {filtered.map((o) => (
              <div
                key={o.name}
                onClick={() => pick(o.name)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-semibold cursor-pointer ${
                  o.name === value ? 'bg-violet-500/15 text-violet-300' : 'text-ink-200 hover:bg-ink-800'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass(o.tag)}`} />
                {o.name}
                {o.tag === 'un' && <span className="ml-auto text-[10px] text-ink-500">unassigned</span>}
              </div>
            ))}
            {!allEmpty && filtered.length === 0 && q && (
              <div
                onClick={() => pick(query.trim())}
                className="px-2.5 py-2 text-xs text-ink-400 italic cursor-pointer hover:bg-ink-800 rounded-md"
              >
                No match — press Enter or click to add "{query.trim()}" as a new name
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
