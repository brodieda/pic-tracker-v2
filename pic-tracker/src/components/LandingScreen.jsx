// components/LandingScreen.jsx
//
// Shown when the device hasn't joined an event yet (eventSession.role === 'none').
// Two paths:
//   - Start a new event   → creates the Supabase event row, becomes the writer
//   - Join an event       → enter a code (writer or viewer), session is created
//
// Once a session exists, the main app takes over.

import { useState } from 'react'
import { createEvent, joinEventByCode } from '../lib/supabaseStore'
import { setWriterSession, setViewerSession } from '../lib/eventSession'
import { normalizeCode, isValidCodeFormat } from '../lib/codeGen'
import { SUPABASE_CONFIGURED } from '../lib/supabaseClient'
import { initialSync } from '../lib/syncEngine'

export default function LandingScreen({ onJoined }) {
  const [mode, setMode] = useState('choose') // 'choose' | 'create' | 'join'
  const [eventName, setEventName] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="panel p-6 max-w-md text-center space-y-2">
          <h2 className="font-display font-bold text-lg">Online mode not configured</h2>
          <p className="text-sm text-ink-400">
            Supabase environment variables are missing. The app needs{' '}
            <code className="text-ink-200">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-ink-200">VITE_SUPABASE_ANON_KEY</code> set in the
            Vercel project settings.
          </p>
        </div>
      </div>
    )
  }

  const handleCreate = async () => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const created = await createEvent({ name: eventName.trim() })
      if (!created) {
        setError('Could not create event. Check your network and try again.')
        return
      }
      setWriterSession({
        eventId: created.id,
        eventName: created.name,
        writerCode: created.writerCode,
        viewerCode: created.viewerCode,
      })
      // Brand-new event — nothing to pull, but run sync to seed empty state cleanly.
      await initialSync()
      onJoined?.()
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    if (busy) return
    setError(null)
    const normalized = normalizeCode(codeInput)
    if (!isValidCodeFormat(normalized)) {
      setError('That code doesn\u2019t look right. Codes are 6 characters, letters and numbers.')
      return
    }
    setBusy(true)
    try {
      const result = await joinEventByCode(normalized)
      if (!result) {
        setError('No event found with that code. Double-check with whoever set up the event.')
        return
      }
      if (result.role === 'writer') {
        setWriterSession({
          eventId: result.event.id,
          eventName: result.event.name,
          writerCode: result.event.writerCode,
          viewerCode: result.event.viewerCode,
        })
      } else {
        setViewerSession({
          eventId: result.event.id,
          eventName: result.event.name,
          viewerCode: result.event.viewerCode,
        })
      }
      // Pull all event state into localStorage so the rest of the app works as-is.
      await initialSync()
      onJoined?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-display font-bold text-2xl tracking-tight">PIC</span>
            <span className="font-display font-bold text-2xl tracking-tight text-ink-400">tracker</span>
          </div>
          <p className="text-sm text-ink-400">Patients in care, tracked.</p>
        </header>

        {mode === 'choose' && (
          <div className="panel p-6 space-y-3">
            <button
              onClick={() => setMode('create')}
              className="btn-primary w-full py-3"
            >
              Start a new event
            </button>
            <button
              onClick={() => setMode('join')}
              className="btn-ghost w-full py-3"
            >
              Join an event
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="panel p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg">Start a new event</h2>
              <p className="text-xs text-ink-400 mt-1">
                You\u2019ll get a writer code and a viewer code. Share them with your team.
              </p>
            </div>
            <div>
              <label className="label">Event name</label>
              <input
                className="input"
                placeholder="e.g. Lost Paradise 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                autoFocus
                disabled={busy}
              />
            </div>
            {error && <div className="text-sm text-code-1 font-semibold">{error}</div>}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('choose')}
                className="btn-ghost flex-1"
                disabled={busy}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary flex-1"
                disabled={busy}
              >
                {busy ? 'Creating\u2026' : 'Create event'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="panel p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg">Join an event</h2>
              <p className="text-xs text-ink-400 mt-1">
                Enter the code shared with you. Writer codes give full access; viewer
                codes are read-only.
              </p>
            </div>
            <div>
              <label className="label">Event code</label>
              <input
                className="input font-display tabular-nums tracking-widest text-center uppercase text-lg"
                placeholder="6-CHAR"
                maxLength={10}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                autoFocus
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin()
                }}
              />
            </div>
            {error && <div className="text-sm text-code-1 font-semibold">{error}</div>}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('choose')}
                className="btn-ghost flex-1"
                disabled={busy}
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                className="btn-primary flex-1"
                disabled={busy || !codeInput.trim()}
              >
                {busy ? 'Joining\u2026' : 'Join'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
