// components/CodesBadge.jsx — header widget for active event codes + end-event flow.

import { useState } from 'react'
import { getSession, clearSession } from '../lib/eventSession'
import { endCurrentEvent } from '../lib/supabaseStore'
import { exportXlsx } from '../lib/xlsxExport'
import { getPics, getEvents, getEvent } from '../lib/store'

export default function CodesBadge({ onLeave }) {
  const session = getSession()
  const [copied, setCopied] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [endingEvent, setEndingEvent] = useState(false)

  if (session.role === 'none') return null

  const copy = (label, value) => {
    if (!value) return
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200)
    })
  }

  const onLeaveClick = async () => {
    if (!confirm('Leave this event on this device? You\u2019ll need the code to rejoin.')) return
    await clearSession()
    onLeave?.()
  }

  const onEndEvent = async () => {
    if (endingEvent) return
    if (session.role !== 'writer') return

    // 1. Force xlsx export first
    const proceed = confirm(
      'Ending the event will:\n\n' +
      ' - Lock out all writers, viewers, and intake users\n' +
      ' - Export the full event data to XLSX first\n' +
      ' - Mark the event archived (codes preserved, can be reopened via Supabase)\n\n' +
      'Continue?'
    )
    if (!proceed) return

    setEndingEvent(true)
    try {
      // Export
      const event = getEvent()
      const pics = getPics()
      const events = getEvents()
      try {
        await exportXlsx({ pics, events, eventCfg: event, cohortLabel: 'final' })
      } catch (e) {
        console.error('xlsx export failed', e)
        const force = confirm('Export failed (no data, or another error). End the event anyway?')
        if (!force) {
          setEndingEvent(false)
          return
        }
      }

      // 2. Set is_active = false in Supabase
      const result = await endCurrentEvent()
      if (!result) {
        alert('Could not end event. Check your network and try again.')
        setEndingEvent(false)
        return
      }

      // 3. Clear local session and reload
      await clearSession()
      alert('Event ended. Exported data has been downloaded.')
      onLeave?.()
    } catch (e) {
      console.error('end event failed', e)
      alert('Something went wrong ending the event.')
    } finally {
      setEndingEvent(false)
    }
  }

  // What to show in the compact pill
  const pillCode = session.role === 'writer'
    ? session.writerCode
    : session.role === 'viewer'
      ? session.viewerCode
      : session.admitCode
  const pillLabel = session.role === 'writer' ? 'Writer'
    : session.role === 'viewer' ? 'Viewer'
    : 'Intake'

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-ink-800 border border-ink-700 hover:border-ink-500 transition"
        title="Event codes"
      >
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-ink-400">
          {pillLabel}
        </span>
        <span className="font-display font-bold tabular-nums text-sm text-ink-100">
          {pillCode || '------'}
        </span>
        <span className="text-ink-500 text-xs">{menuOpen ? '\u25B4' : '\u25BE'}</span>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
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
                <CodeCopyBox
                  code={session.writerCode}
                  copied={copied === 'writer'}
                  onClick={() => copy('writer', session.writerCode)}
                />
              </div>
            )}

            {(session.role === 'writer' || session.role === 'viewer') && (
              <div>
                <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
                  Viewer code (read-only)
                </div>
                <CodeCopyBox
                  code={session.viewerCode}
                  copied={copied === 'viewer'}
                  onClick={() => copy('viewer', session.viewerCode)}
                />
              </div>
            )}

            {session.role === 'writer' && session.admitCode && (
              <div>
                <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
                  Intake code (admit-only)
                </div>
                <CodeCopyBox
                  code={session.admitCode}
                  copied={copied === 'admit'}
                  onClick={() => copy('admit', session.admitCode)}
                />
              </div>
            )}

            <div className="border-t border-ink-800 pt-2 space-y-1">
              <button onClick={onLeaveClick} className="w-full text-left text-xs text-ink-400 hover:text-ink-200 px-1 py-1">
                Leave event on this device
              </button>
              {session.role === 'writer' && (
                <button
                  onClick={onEndEvent}
                  disabled={endingEvent}
                  className="w-full text-left text-xs text-code-1 hover:text-white hover:bg-code-1 px-1 py-1 rounded"
                >
                  {endingEvent ? 'Ending\u2026' : 'End event (downloads XLSX first)'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CodeCopyBox({ code, copied, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-ink-900 border border-ink-700 hover:border-ink-500 rounded-md px-3 py-2 font-display font-bold tabular-nums text-base text-ink-100 transition flex items-center justify-between gap-2"
    >
      <span className="tracking-widest">{code || '------'}</span>
      <span className="text-[10px] uppercase tracking-widest text-ink-500">
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  )
}
