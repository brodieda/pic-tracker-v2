import { useEffect, useRef, useState } from 'react'
import { getSession } from '../lib/eventSession'
import CodesBadge from './CodesBadge'
import ActorNameBadge from './ActorNameBadge'
import ThemeToggle from './ThemeToggle'

// SessionMenu — the single avatar entry point in the nav bar that replaces
// the loose row of Writer/You/Theme/Version pills. CodesBadge and
// ActorNameBadge are rendered as-is inside it (their own rotate-code /
// end-event / actor-name-edit logic untouched) rather than reimplemented,
// so nothing about those flows changes — just where they live.
export default function SessionMenu({ onLeave, showSession }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const session = getSession()

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const rawCode = session.writerCode || session.viewerCode || session.admitCode || ''
  const initials = rawCode.slice(0, 2).toUpperCase() || '··'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Session menu"
        aria-label="Session menu"
        className="w-9 h-9 rounded-md bg-ink-100 text-ink-950 font-display font-black text-xs flex items-center justify-center hover:opacity-90 transition shrink-0"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 w-72 panel p-2 shadow-2xl space-y-1">
          {showSession && (
            <>
              <div className="px-1 py-1">
                <ActorNameBadge />
              </div>
              <div className="px-1 py-1">
                <CodesBadge onLeave={onLeave} />
              </div>
            </>
          )}

          <div className="border-t border-ink-800 mt-1 pt-2 px-1 flex items-center justify-between">
            <ThemeToggle />
            <span className="text-xs text-ink-500 font-display tracking-wider">v0.6</span>
          </div>
        </div>
      )}
    </div>
  )
}
