// components/ArchiveScreen.jsx — second step of the End-then-Archive flow.
//
// Accessed from the LandingScreen via "Archive a past event".
// User enters their old writer code, sees a confirmation screen with
// counts of what will be deleted, types the event name to confirm,
// then the data is permanently destroyed.

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  joinEndedEventForArchive,
  archiveEndedEvent,
  getPicsForCurrentEvent,
  getActivityForCurrentEvent,
} from '../lib/supabaseStore'
import { clearSession } from '../lib/eventSession'
import { exportXlsx } from '../lib/xlsxExport'

export default function ArchiveScreen({ onBack, onArchived }) {
  // 'code' | 'review' | 'confirm' | 'archiving' | 'done'
  const [phase, setPhase] = useState('code')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [eventInfo, setEventInfo] = useState(null) // { eventId, eventName, picsCount, activityCount }
  const [confirmText, setConfirmText] = useState('')
  const [result, setResult] = useState(null)

  const submitCode = async () => {
    setError(null)
    if (!code.trim()) return
    setBusy(true)
    try {
      const joined = await joinEndedEventForArchive(code)
      // Now we're bound; fetch what would be deleted
      const pics = await getPicsForCurrentEvent()
      const activity = await getActivityForCurrentEvent()
      setEventInfo({
        eventId: joined.eventId,
        eventName: joined.eventName,
        picsCount: pics.length,
        activityCount: activity.length,
        pics,
        activity,
      })
      setPhase('review')
    } catch (e) {
      console.error('archive join failed', e)
      setError(
        e.message?.includes('No ended event')
          ? 'No ended event found with that writer code. Codes for active events can\u2019t be used here — end the event first.'
          : (e.message || 'Could not look up event.')
      )
    } finally {
      setBusy(false)
    }
  }

  const downloadBackup = async () => {
    if (!eventInfo) return
    setBusy(true)
    try {
      // Build pseudo-localStorage view from Supabase data for the export
      const eventCfg = {
        name: eventInfo.eventName,
        shift1Team: [],
        shift2Team: [],
      }
      await exportXlsx({
        pics: eventInfo.pics,
        events: eventInfo.activity,
        eventCfg,
        cohortLabel: 'archive-backup',
      })
    } catch (e) {
      console.error('backup export failed', e)
      alert('Backup export failed: ' + (e.message || 'Unknown error'))
    } finally {
      setBusy(false)
    }
  }

  const submitArchive = async () => {
    if (!eventInfo) return
    if (confirmText.trim() !== eventInfo.eventName.trim()) {
      setError('Event name does not match.')
      return
    }
    setError(null)
    setBusy(true)
    setPhase('archiving')
    try {
      const result = await archiveEndedEvent(eventInfo.eventId)
      setResult(result)
      setPhase('done')
      // Clear local session — the event is gone, JWT is stale
      await clearSession()
    } catch (e) {
      console.error('archive failed', e)
      setError('Archive failed: ' + (e.message || 'Unknown error'))
      setPhase('confirm')
    } finally {
      setBusy(false)
    }
  }

  const onDone = async () => {
    // Sign out the anonymous session so a fresh join is possible
    try { await supabase?.auth.signOut() } catch { /* noop */ }
    onArchived?.()
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-xs text-ink-400 hover:text-ink-200 px-2 py-1"
            disabled={busy}
          >
            \u2190 Back
          </button>
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500">
            Archive a past event
          </div>
        </div>

        <div className="panel p-6 space-y-5">

          {phase === 'code' && (
            <>
              <div>
                <h1 className="text-xl font-display font-bold text-ink-100 mb-2">
                  Permanently delete event data
                </h1>
                <p className="text-sm text-ink-300 leading-relaxed">
                  Enter the writer code from a previously-ended event. All PIC
                  records, activity logs, and access tokens for that event will
                  be permanently deleted from Supabase.
                </p>
                <p className="text-xs text-ink-500 mt-3">
                  The event must already be ended (is_active = false). Use the
                  End event button in the codes badge first if it\u2019s still active.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 block mb-1">
                  Writer code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitCode() }}
                  placeholder="------"
                  maxLength={10}
                  autoFocus
                  className="w-full bg-ink-900 border border-ink-700 focus:border-ink-500 rounded-md px-3 py-2.5 text-ink-100 font-display font-bold tabular-nums tracking-widest text-lg"
                />
              </div>

              {error && (
                <div className="text-sm text-code-1 bg-code-1/10 border border-code-1/30 rounded p-3">
                  {error}
                </div>
              )}

              <button
                onClick={submitCode}
                disabled={busy || !code.trim()}
                className="w-full bg-ink-100 text-ink-900 font-display font-bold uppercase tracking-widest text-xs py-3 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? 'Looking up\u2026' : 'Look up event'}
              </button>
            </>
          )}

          {phase === 'review' && eventInfo && (
            <>
              <div>
                <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
                  Event found
                </div>
                <h1 className="text-xl font-display font-bold text-ink-100">
                  {eventInfo.eventName}
                </h1>
              </div>

              <div className="bg-ink-900 border border-ink-700 rounded-md p-4 space-y-2">
                <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500">
                  Will be permanently deleted
                </div>
                <ul className="text-sm text-ink-200 space-y-1">
                  <li className="flex justify-between"><span>PIC records</span><span className="tabular-nums font-display font-semibold">{eventInfo.picsCount}</span></li>
                  <li className="flex justify-between"><span>Activity log entries</span><span className="tabular-nums font-display font-semibold">{eventInfo.activityCount}</span></li>
                  <li className="flex justify-between"><span>Event record</span><span className="tabular-nums font-display font-semibold">1</span></li>
                  <li className="flex justify-between"><span>Anonymous user tokens</span><span className="tabular-nums font-display font-semibold text-ink-400">all tied to this event</span></li>
                </ul>
              </div>

              <div className="bg-warn-amber/10 border border-warn-amber/40 rounded-md p-3 text-xs text-warn-amber leading-relaxed">
                <strong>This cannot be undone.</strong> Download a backup XLSX
                first if you haven\u2019t already saved one.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={downloadBackup}
                  disabled={busy}
                  className="flex-1 bg-ink-800 border border-ink-700 hover:border-ink-500 text-ink-200 text-xs font-display font-bold uppercase tracking-widest py-2.5 rounded-md disabled:opacity-40"
                >
                  {busy ? 'Exporting\u2026' : 'Download backup XLSX'}
                </button>
                <button
                  onClick={() => { setError(null); setPhase('confirm'); setConfirmText('') }}
                  disabled={busy}
                  className="flex-1 bg-code-1 text-white text-xs font-display font-bold uppercase tracking-widest py-2.5 rounded-md hover:opacity-90 disabled:opacity-40"
                >
                  Continue to delete
                </button>
              </div>
            </>
          )}

          {phase === 'confirm' && eventInfo && (
            <>
              <div>
                <h1 className="text-xl font-display font-bold text-ink-100 mb-2">
                  Confirm permanent deletion
                </h1>
                <p className="text-sm text-ink-300 leading-relaxed">
                  Type the event name exactly to confirm:
                </p>
                <p className="text-sm font-display font-bold text-ink-100 mt-2">
                  {eventInfo.eventName}
                </p>
              </div>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type event name to confirm"
                autoFocus
                className="w-full bg-ink-900 border border-ink-700 focus:border-code-1 rounded-md px-3 py-2.5 text-ink-100 font-display"
              />

              {error && (
                <div className="text-sm text-code-1 bg-code-1/10 border border-code-1/30 rounded p-3">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setPhase('review'); setError(null) }}
                  disabled={busy}
                  className="flex-1 bg-ink-800 border border-ink-700 hover:border-ink-500 text-ink-200 text-xs font-display font-bold uppercase tracking-widest py-2.5 rounded-md disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={submitArchive}
                  disabled={busy || confirmText.trim() !== eventInfo.eventName.trim()}
                  className="flex-1 bg-code-1 text-white text-xs font-display font-bold uppercase tracking-widest py-2.5 rounded-md hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {busy ? 'Deleting\u2026' : 'Delete permanently'}
                </button>
              </div>
            </>
          )}

          {phase === 'archiving' && (
            <div className="text-center py-6">
              <div className="text-sm text-ink-300">Deleting event data\u2026</div>
            </div>
          )}

          {phase === 'done' && result && (
            <>
              <div>
                <h1 className="text-xl font-display font-bold text-ink-100 mb-2">
                  Event archived
                </h1>
                <p className="text-sm text-ink-300 leading-relaxed">
                  <strong className="text-ink-100">{result.eventName}</strong> has been permanently deleted.
                </p>
              </div>

              <div className="bg-ink-900 border border-ink-700 rounded-md p-4 space-y-2 text-sm text-ink-300">
                <div className="flex justify-between"><span>PICs deleted</span><span className="tabular-nums font-display">{result.picsDeleted}</span></div>
                <div className="flex justify-between"><span>Activity entries deleted</span><span className="tabular-nums font-display">{result.activityDeleted}</span></div>
                <div className="flex justify-between"><span>User tokens revoked</span><span className="tabular-nums font-display">{result.usersDeleted}</span></div>
              </div>

              <button
                onClick={onDone}
                className="w-full bg-ink-100 text-ink-900 font-display font-bold uppercase tracking-widest text-xs py-3 rounded-md hover:bg-white"
              >
                Done
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
