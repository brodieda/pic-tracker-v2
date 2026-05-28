// components/LandingScreen.jsx
//
// Two paths: create a new event (becomes writer), or join with any of the
// three codes (writer/viewer/intake_only — role detected automatically).

import { useState } from 'react'
import { createEventAndJoin, joinByCode } from '../lib/supabaseStore'
import { normalizeCode, isValidCodeFormat } from '../lib/codeGen'
import { SUPABASE_CONFIGURED } from '../lib/supabaseClient'
import { initialSync, resetLocalState } from '../lib/syncEngine'
import ArchiveScreen from './ArchiveScreen'

export default function LandingScreen({ onJoined }) {
  const [mode, setMode] = useState('choose')
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

  if (mode === 'archive') {
    return (
      <ArchiveScreen
        onBack={() => setMode('choose')}
        onArchived={() => setMode('choose')}
      />
    )
  }

  const handleCreate = async () => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const { role } = await createEventAndJoin({ name: eventName.trim() })
      if (role !== 'intake_only') {
        // Wipe any stale local state from previous events/testing so the
        // new event starts at PIC #1 with no leftover PICs or activity.
        resetLocalState()
        await initialSync()
      }
      onJoined?.()
    } catch (e) {
      setError(`Could not create event: ${e.message || 'unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    if (busy) return
    setError(null)
    const normalized = normalizeCode(codeInput)
    if (!isValidCodeFormat(normalized)) {
      setError("That code doesn't look right. Codes are 6 characters, letters and numbers.")
      return
    }
    setBusy(true)
    try {
      const { role } = await joinByCode(normalized)
      if (role !== 'intake_only') {
        // Wipe stale local state; initialSync repopulates from Supabase.
        resetLocalState()
        await initialSync()
      }
      onJoined?.()
    } catch (e) {
      setError("No active event found with that code. Double-check with whoever set up the event.")
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
          <>
            <div className="panel p-6 space-y-3">
              <button onClick={() => setMode('create')} className="btn-primary w-full py-3">
                Start a new event
              </button>
              <button onClick={() => setMode('join')} className="btn-ghost w-full py-3">
                Join an event
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={() => setMode('archive')}
                className="text-xs text-ink-500 hover:text-ink-300 underline-offset-4 hover:underline"
              >
                Archive a past event &middot; permanently delete data
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <div className="panel p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg">Start a new event</h2>
              <p className="text-xs text-ink-400 mt-1">
                You&rsquo;ll get three codes &mdash; writer (full access), viewer (read-only), and intake (admit-only). Share them with your team as needed.
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
              <button onClick={() => setMode('choose')} className="btn-ghost flex-1" disabled={busy}>Back</button>
              <button onClick={handleCreate} className="btn-primary flex-1" disabled={busy}>
                {busy ? 'Creating&hellip;' : 'Create event'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="panel p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg">Join an event</h2>
              <p className="text-xs text-ink-400 mt-1">
                Enter the code shared with you. The app will detect whether it&rsquo;s a writer, viewer, or intake code automatically.
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
              />
            </div>
            {error && <div className="text-sm text-code-1 font-semibold">{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setMode('choose')} className="btn-ghost flex-1" disabled={busy}>Back</button>
              <button onClick={handleJoin} className="btn-primary flex-1" disabled={busy || !codeInput.trim()}>
                {busy ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
