import { useEffect, useRef, useState } from 'react'
import { getSession, clearSession, isWriter } from '../lib/eventSession'
import { rotateEventCode, endCurrentEvent } from '../lib/supabaseStore'
import { exportXlsx } from '../lib/xlsxExport'
import { getPics, getEvents, getEvent } from '../lib/store'
import { getActorName, setActorName } from '../lib/actorName'
import { getStoredTheme, setTheme, resolveTheme } from '../lib/theme'

function PersonIcon({ className = 'w-[18px] h-[18px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function RotateIcon({ spinning }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={spinning ? 'animate-spin' : ''}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}
function LeaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
function EndIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  )
}

function CodeRow({ accentClass, label, code, canRotate, onCopy, copied, onRotate, rotating }) {
  return (
    <div className="flex items-center gap-3 py-2 [&+&]:border-t [&+&]:border-ink-800">
      <span className={`w-1 h-7 rounded-full shrink-0 ${accentClass}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[9.5px] font-display font-bold uppercase tracking-wide text-ink-500">{label}</div>
        <div className="text-[15px] font-display font-bold tracking-wide text-ink-100 tabular-nums">{code || '------'}</div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onCopy}
          title="Copy"
          className={`w-7 h-7 rounded-md flex items-center justify-center transition hover:bg-ink-800 ${
            copied ? 'text-code-5' : 'text-ink-500 hover:text-ink-200'
          }`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        {canRotate && (
          <button
            onClick={onRotate}
            disabled={rotating}
            title="Rotate (incident response)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-ink-800 transition disabled:opacity-50"
          >
            <RotateIcon spinning={rotating} />
          </button>
        )}
      </div>
    </div>
  )
}

// SessionMenu — the single avatar entry point in the nav bar: your name,
// the event's access codes, dark mode, and the two session-ending actions.
// No "Access" row — role is implied by which codes/actions are visible.
export default function SessionMenu({ onLeave }) {
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [copied, setCopied] = useState(null)
  const [rotating, setRotating] = useState(null)
  const [endingEvent, setEndingEvent] = useState(false)
  const [themePref, setThemePref] = useState(getStoredTheme())
  const ref = useRef(null)

  const session = getSession()
  const name = getActorName()
  const writer = isWriter()

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setEditingName(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const copy = (label, value) => {
    if (!value) return
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200)
    })
  }

  const onRotateClick = async (which) => {
    if (rotating || !writer) return
    const labels = { writer: 'WRITER code (full access)', viewer: 'VIEWER code (read-only)', admit: 'INTAKE code (admit-only)' }
    const consequence =
      which === 'writer'
        ? 'All OTHER writer devices will be locked out.'
        : which === 'viewer'
        ? 'All viewer devices will be locked out.'
        : 'All intake-only devices (rovers) will be locked out.'
    const proceed = confirm(
      `Rotate the ${labels[which]}?\n\n${consequence}\n\nA new code will be generated. You'll need to share it with anyone who needs the new role.\n\nThis is an incident-response action — use it if a code has been leaked.`,
    )
    if (!proceed) return
    setRotating(which)
    try {
      const newCode = await rotateEventCode(which)
      if (!newCode) {
        alert('Rotation failed. Check your network and try again.')
        return
      }
      alert(`New ${labels[which]}:\n\n${newCode}\n\nShare this with your team.`)
    } catch (e) {
      console.error('rotate failed', e)
      alert('Rotation failed: ' + (e.message || 'Unknown error'))
    } finally {
      setRotating(null)
    }
  }

  const onLeaveClick = async () => {
    if (!confirm("Leave this event on this device? You'll need the code to rejoin.")) return
    await clearSession()
    setOpen(false)
    onLeave?.()
  }

  const onEndEvent = async () => {
    if (endingEvent || !writer) return
    const proceed = confirm(
      'Ending the event will:\n\n' +
        ' - Lock out all writers, viewers, and intake users\n' +
        ' - Export the full event data to XLSX first\n' +
        ' - Mark the event archived (codes preserved, can be reopened via Supabase)\n\n' +
        'Continue?',
    )
    if (!proceed) return
    setEndingEvent(true)
    try {
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
      const result = await endCurrentEvent()
      if (!result) {
        alert('Could not end event. Check your network and try again.')
        setEndingEvent(false)
        return
      }
      await clearSession()
      alert('Event ended. Exported data has been downloaded.')
      setOpen(false)
      onLeave?.()
    } catch (e) {
      console.error('end event failed', e)
      alert('Something went wrong ending the event.')
    } finally {
      setEndingEvent(false)
    }
  }

  const saveName = () => {
    setActorName(nameDraft.trim())
    setEditingName(false)
  }

  const resolved = resolveTheme(themePref)
  const isDark = resolved === 'dark'
  const onToggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    setThemePref(next)
  }

  if (session.role === 'none') return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Session menu"
        aria-label="Session menu"
        className="w-9 h-9 rounded-md bg-gradient-to-br from-ink-700 to-ink-950 text-ink-100 flex items-center justify-center hover:opacity-90 transition shrink-0 ring-1 ring-white/5"
      >
        <PersonIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 w-80 bg-ink-900 rounded-2xl shadow-2xl ring-1 ring-ink-700 overflow-hidden">
          {/* Header: avatar + name + edit */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink-700 to-ink-950 flex items-center justify-center shrink-0 ring-1 ring-white/5">
              <PersonIcon className="w-[18px] h-[18px] text-ink-100" />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    placeholder="Your name"
                    maxLength={60}
                    className="flex-1 bg-ink-950 border border-ink-700 focus:border-ink-500 rounded-md px-2 py-1 text-sm font-display font-semibold text-ink-100 outline-none min-w-0"
                  />
                  <button onClick={saveName} className="text-xs font-display font-bold text-ink-100 hover:text-white px-2 py-1 shrink-0">
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-[16.5px] font-display font-extrabold text-ink-100 truncate leading-tight">
                    {name || 'Set your name'}
                  </div>
                  <div className="text-[11px] text-ink-500 font-medium mt-0.5">Signed in on this device</div>
                </>
              )}
            </div>
            {!editingName && (
              <button
                onClick={() => {
                  setNameDraft(name)
                  setEditingName(true)
                }}
                title="Change your name"
                className="w-7 h-7 rounded-md bg-ink-800 hover:bg-ink-700 flex items-center justify-center text-ink-400 hover:text-ink-100 transition shrink-0"
              >
                <PencilIcon />
              </button>
            )}
          </div>

          <div className="h-px bg-ink-800" />

          {/* Access codes — writers see all three with rotate; viewers see only their own, no rotate */}
          <div className="px-4 py-3">
            <div className="text-[10px] font-display font-bold uppercase tracking-wide text-ink-600 mb-1">
              Access codes
            </div>
            {writer && (
              <>
                <CodeRow
                  accentClass="bg-code-5"
                  label="Writer · full access"
                  code={session.writerCode}
                  canRotate
                  copied={copied === 'writer'}
                  onCopy={() => copy('writer', session.writerCode)}
                  rotating={rotating === 'writer'}
                  onRotate={() => onRotateClick('writer')}
                />
                <CodeRow
                  accentClass="bg-violet-500"
                  label="Viewer · read only"
                  code={session.viewerCode}
                  canRotate
                  copied={copied === 'viewer'}
                  onCopy={() => copy('viewer', session.viewerCode)}
                  rotating={rotating === 'viewer'}
                  onRotate={() => onRotateClick('viewer')}
                />
                {session.admitCode && (
                  <CodeRow
                    accentClass="bg-teal-500"
                    label="Intake · admit only"
                    code={session.admitCode}
                    canRotate
                    copied={copied === 'admit'}
                    onCopy={() => copy('admit', session.admitCode)}
                    rotating={rotating === 'admit'}
                    onRotate={() => onRotateClick('admit')}
                  />
                )}
              </>
            )}
            {!writer && (
              <CodeRow
                accentClass="bg-violet-500"
                label="Viewer · read only"
                code={session.viewerCode}
                canRotate={false}
                copied={copied === 'viewer'}
                onCopy={() => copy('viewer', session.viewerCode)}
              />
            )}
          </div>

          <div className="h-px bg-ink-800" />

          {/* Dark theme — binary switch. Picking either side opts out of "system" auto-detection. */}
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-ink-800/50 transition"
          >
            <span className="flex items-center gap-2.5 text-sm font-display font-semibold text-ink-100">
              <span className="w-6 h-6 rounded-md bg-ink-800 flex items-center justify-center text-xs">
                {isDark ? '🌙' : '☀️'}
              </span>
              Dark theme
            </span>
            <span
              className={`relative inline-flex items-center h-6 w-[42px] rounded-full transition shrink-0 ${
                isDark ? 'bg-ink-100' : 'bg-ink-700'
              }`}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full shadow transform transition ${
                  isDark ? 'translate-x-[19px] bg-ink-950' : 'translate-x-0.5 bg-white'
                }`}
              />
            </span>
          </button>

          <div className="h-px bg-ink-800" />

          {/* Session actions */}
          <div className="p-1.5">
            <button
              onClick={onLeaveClick}
              className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-display font-semibold text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition"
            >
              <LeaveIcon />
              Leave event on this device
            </button>
            {writer && (
              <button
                onClick={onEndEvent}
                disabled={endingEvent}
                className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-display font-semibold text-code-1 hover:bg-code-1/10 transition disabled:opacity-50"
              >
                <EndIcon />
                {endingEvent ? 'Ending…' : (
                  <>
                    End event <span className="font-medium opacity-75">(downloads XLSX first)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
