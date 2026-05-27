// components/CodesBadge.jsx
//
// Compact widget for the header that shows the active event's codes.
// Writer sees both codes, viewer sees only their viewer code.
// Click a code to copy to clipboard.

import { useState } from 'react'
import { getSession, clearSession } from '../lib/eventSession'

export default function CodesBadge({ onLeave }) {
  const session = getSession()
  const [copied, setCopied] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  if (session.role === 'none') return null

  const copy = (label, value) => {
    if (!value) return
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200)
    })
  }

  const onLeaveClick = () => {
    if (!confirm('Leave this event on this device? You\u2019ll need the code to rejoin.')) return
    clearSession()
    onLeave?.()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-ink-800 border border-ink-700 hover:border-ink-500 transition"
        title="Event codes"
      >
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-ink-400">
          {session.role === 'writer' ? 'Writer' : 'Viewer'}
        </span>
        <span className="font-display font-bold tabular-nums text-sm text-ink-100">
          {session.role === 'writer' ? session.writerCode : session.viewerCode}
        </span>
        <span className="text-ink-500 text-xs">{menuOpen ? '\u25B4' : '\u25BE'}</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-40 w-72 panel p-3 shadow-2xl space-y-3">
            <div>
              <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
                Event
              </div>
              <div className="text-sm font-display font-semibold text-ink-100 truncate">
                {session.eventName || 'Untitled event'}
              </div>
            </div>

            {session.role === 'writer' && (
              <div>
                <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
                  Writer code (full access)
                </div>
                <button
                  onClick={() => copy('writer', session.writerCode)}
                  className="w-full text-left bg-ink-900 border border-ink-700 hover:border-ink-500 rounded-md px-3 py-2 font-display font-bold tabular-nums text-base text-ink-100 transition flex items-center justify-between gap-2"
                >
                  <span className="tracking-widest">{session.writerCode}</span>
                  <span className="text-[10px] uppercase tracking-widest text-ink-500">
                    {copied === 'writer' ? 'copied' : 'copy'}
                  </span>
                </button>
              </div>
            )}

            <div>
              <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
                Viewer code (read-only)
              </div>
              <button
                onClick={() => copy('viewer', session.viewerCode)}
                className="w-full text-left bg-ink-900 border border-ink-700 hover:border-ink-500 rounded-md px-3 py-2 font-display font-bold tabular-nums text-base text-ink-100 transition flex items-center justify-between gap-2"
              >
                <span className="tracking-widest">{session.viewerCode}</span>
                <span className="text-[10px] uppercase tracking-widest text-ink-500">
                  {copied === 'viewer' ? 'copied' : 'copy'}
                </span>
              </button>
            </div>

            <div className="border-t border-ink-800 pt-2">
              <button
                onClick={onLeaveClick}
                className="w-full text-left text-xs text-ink-400 hover:text-code-1 px-1 py-1"
              >
                Leave event on this device
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
