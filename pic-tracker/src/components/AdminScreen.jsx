import { useEffect, useState } from 'react'
import {
  adminLogin,
  adminLogout,
  isAdminLoggedIn,
  adminListEvents,
  adminEventRoster,
  adminRotateAllCodes,
  adminEndEvent,
  adminDeleteEvent,
  adminEventExportData,
  syncActorPresence,
} from '../lib/adminStore'
import { exportXlsx } from '../lib/xlsxExport'
import { joinByCode } from '../lib/supabaseStore'
import { initialSync, resetLocalState } from '../lib/syncEngine'
import { getActorNameForLog } from '../lib/actorName'

const ROLE_LABEL = { writer: 'Writer', viewer: 'Viewer', intake_only: 'Intake' }
const ROLE_DOT = { writer: 'bg-code-5', viewer: 'bg-violet-500', intake_only: 'bg-shift-1' }

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function CodeChip({ label, code, dotClass, onCopy, copied }) {
  return (
    <div className="flex-1 min-w-[130px] bg-ink-950 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1 h-6 rounded-full shrink-0 ${dotClass}`} />
        <div className="min-w-0">
          <div className="text-[9px] font-display font-bold uppercase tracking-wide text-ink-500">{label}</div>
          <div className="text-sm font-display font-bold tracking-wide text-ink-100 truncate">{code || '—'}</div>
        </div>
      </div>
      <button
        onClick={onCopy}
        title="Copy"
        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition ${
          copied ? 'text-code-5' : 'text-ink-500 hover:text-ink-200 hover:bg-ink-800'
        }`}
      >
        {copied ? '✓' : '⧉'}
      </button>
    </div>
  )
}

function EventCard({ ev, onChanged, onJoined }) {
  const [roster, setRoster] = useState(null)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [copied, setCopied] = useState(null)
  const [busy, setBusy] = useState(null) // 'rotate' | 'end' | 'delete' | 'export' | null
  const [codes, setCodes] = useState({
    writerCode: ev.writerCode,
    viewerCode: ev.viewerCode,
    admitCode: ev.admitCode,
  })
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const loadRoster = async () => {
    try {
      const rows = await adminEventRoster(ev.id)
      setRoster(rows)
    } catch (e) {
      console.error('load roster failed', e)
      setRoster([])
    }
  }

  useEffect(() => {
    loadRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = (label, value) => {
    if (!value) return
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200)
    })
  }

  const onRotate = async () => {
    if (busy) return
    if (!confirm(`Kick everyone off "${ev.name}"?\n\nThis generates new codes and invalidates the current ones — anyone connected loses access until someone shares the new codes.`)) return
    setBusy('rotate')
    try {
      const fresh = await adminRotateAllCodes(ev.id)
      if (fresh) setCodes(fresh)
    } catch (e) {
      alert('Could not rotate codes: ' + (e.message || 'unknown error'))
    } finally {
      setBusy(null)
    }
  }

  const onEnd = async () => {
    if (busy) return
    if (!confirm(`End "${ev.name}"?\n\nMarks it inactive. Data is kept — this doesn't delete anything.`)) return
    setBusy('end')
    try {
      await adminEndEvent(ev.id)
      onChanged?.()
    } catch (e) {
      alert('Could not end event: ' + (e.message || 'unknown error'))
    } finally {
      setBusy(null)
    }
  }

  const onDownload = async () => {
    if (busy) return
    setBusy('export')
    try {
      const data = await adminEventExportData(ev.id)
      await exportXlsx({
        pics: data.pics || [],
        events: data.activity || [],
        eventCfg: data.event || {},
        cohortLabel: 'admin-export',
      })
    } catch (e) {
      alert('Export failed: ' + (e.message || 'unknown error'))
    } finally {
      setBusy(null)
    }
  }

  const onDelete = async () => {
    if (busy) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setBusy('delete')
    try {
      await adminDeleteEvent(ev.id)
      onChanged?.()
    } catch (e) {
      alert('Could not delete event: ' + (e.message || 'unknown error'))
      setBusy(null)
    }
  }

  const onLoginAsWriter = async () => {
    if (busy) return
    if (!codes.writerCode) {
      alert('No writer code on this event.')
      return
    }
    if (!confirm(`Log in to "${ev.name}" as writer?\n\nThis leaves the admin dashboard and opens the event as normal.`)) return
    setBusy('login')
    try {
      const { role } = await joinByCode(codes.writerCode)
      if (role !== 'intake_only') {
        resetLocalState()
        await initialSync()
      }
      syncActorPresence(getActorNameForLog())
      onJoined?.()
    } catch (e) {
      alert('Could not log in: ' + (e.message || 'unknown error'))
      setBusy(null)
    }
  }

  return (
    <div className="bg-ink-900 border border-ink-800 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-display font-bold text-ink-100 truncate">{ev.name}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">
            Created {formatDate(ev.createdAt)} {ev.isActive === false && <span className="text-ink-600">· ended</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <CodeChip label="Writer" code={codes.writerCode} dotClass="bg-code-5" onCopy={() => copy('writer', codes.writerCode)} copied={copied === 'writer'} />
        <CodeChip label="Viewer" code={codes.viewerCode} dotClass="bg-violet-500" onCopy={() => copy('viewer', codes.viewerCode)} copied={copied === 'viewer'} />
        <CodeChip label="Intake" code={codes.admitCode} dotClass="bg-shift-1" onCopy={() => copy('admit', codes.admitCode)} copied={copied === 'admit'} />
      </div>

      <button
        onClick={() => setRosterOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left text-[10px] font-display font-bold uppercase tracking-wide text-ink-500 hover:text-ink-300 mb-2"
      >
        <span>Who's signed in{roster ? ` (${roster.length})` : ''}</span>
        <span className={`transition-transform ${rosterOpen ? 'rotate-90' : ''}`}>›</span>
      </button>

      {rosterOpen && (
        <div className="mb-4">
          {roster === null && <p className="text-xs text-ink-500 italic py-2">Loading…</p>}
          {roster && roster.length === 0 && (
            <p className="text-xs text-ink-500 italic py-2">No one has joined with these codes.</p>
          )}
          {roster &&
            roster.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-t border-ink-800 first:border-t-0">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 ${ROLE_DOT[r.role] || 'bg-ink-600'}`}
                >
                  {ROLE_LABEL[r.role]?.[0] || '?'}
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-ink-200 truncate">{r.actorName}</span>
                <span className="text-[10px] font-display font-bold uppercase tracking-wide text-ink-500 shrink-0">
                  {ROLE_LABEL[r.role] || r.role}
                </span>
                <span className="text-[10.5px] text-ink-600 shrink-0 hidden sm:inline">joined {formatDate(r.firstJoinedAt)}</span>
              </div>
            ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-3 border-t border-ink-800">
        <button
          onClick={onLoginAsWriter}
          disabled={!!busy || !codes.writerCode}
          className="text-xs font-display font-bold px-3 py-2 rounded-lg bg-ink-100 text-ink-950 hover:opacity-90 transition disabled:opacity-50"
        >
          {busy === 'login' ? 'Logging in…' : 'Log in as writer'}
        </button>
        <button
          onClick={onRotate}
          disabled={!!busy}
          className="text-xs font-display font-bold px-3 py-2 rounded-lg bg-ink-800 text-code-3 hover:bg-ink-700 transition disabled:opacity-50"
        >
          {busy === 'rotate' ? 'Resetting…' : 'Reset codes'}
        </button>
        <button
          onClick={onDownload}
          disabled={!!busy}
          className="text-xs font-display font-bold px-3 py-2 rounded-lg bg-ink-800 text-ink-200 hover:bg-ink-700 transition disabled:opacity-50"
        >
          {busy === 'export' ? 'Preparing…' : 'Download log'}
        </button>
        {ev.isActive !== false && (
          <button
            onClick={onEnd}
            disabled={!!busy}
            className="text-xs font-display font-bold px-3 py-2 rounded-lg bg-ink-800 text-ink-200 hover:bg-ink-700 transition disabled:opacity-50"
          >
            {busy === 'end' ? 'Ending…' : 'End event'}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={!!busy}
          onBlur={() => setConfirmingDelete(false)}
          className={`text-xs font-display font-bold px-3 py-2 rounded-lg transition disabled:opacity-50 ${
            confirmingDelete ? 'bg-code-1 text-white' : 'bg-code-1/10 text-code-1 hover:bg-code-1/20'
          }`}
        >
          {busy === 'delete'
            ? 'Deleting…'
            : confirmingDelete
            ? 'Really delete? Tap again'
            : 'Delete permanently'}
        </button>
      </div>
    </div>
  )
}

export default function AdminScreen({ onBack, onJoined, onCreateEvent }) {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn())
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [events, setEvents] = useState(null)

  const load = async () => {
    setError(null)
    try {
      const rows = await adminListEvents()
      setEvents(rows)
    } catch (e) {
      if ((e.message || '').toLowerCase().includes('not authorized')) {
        setLoggedIn(false)
      } else {
        setError(e.message || 'Could not load events.')
      }
    }
  }

  useEffect(() => {
    if (loggedIn) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn])

  const onLogin = async () => {
    if (busy || !code.trim()) return
    setBusy(true)
    setError(null)
    try {
      const ok = await adminLogin(code.trim())
      if (!ok) {
        setError('Incorrect admin code.')
        return
      }
      setLoggedIn(true)
    } catch (e) {
      setError(e.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  const onLogout = () => {
    adminLogout()
    setLoggedIn(false)
    setEvents(null)
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-4">
          <div className="panel p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-ink-800 flex items-center justify-center text-ink-400 text-lg">
              🔒
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-ink-100">Admin access</h2>
              <p className="text-sm text-ink-500 mt-0.5">Separate from event codes — for viewing across all events.</p>
            </div>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLogin()}
              placeholder="Admin code"
              autoFocus
              className="input w-full"
            />
            {error && <p className="text-sm text-code-1">{error}</p>}
            <button onClick={onLogin} disabled={busy} className="btn-primary w-full py-3">
              {busy ? 'Checking…' : 'Enter'}
            </button>
          </div>
          <button onClick={onBack} className="w-full text-center text-xs text-ink-500 hover:text-ink-300">
            ← Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ admin</p>
          <h2 className="text-2xl font-display font-bold text-ink-100">All events</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCreateEvent} className="btn-primary text-sm">
            + New event
          </button>
          <button onClick={onBack} className="btn-ghost text-sm">
            ← Back
          </button>
          <button onClick={onLogout} className="btn-ghost text-sm">
            Log out
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-code-1 mb-4">{error}</p>}

      {events === null && <p className="text-sm text-ink-500 italic">Loading events…</p>}
      {events && events.length === 0 && <p className="text-sm text-ink-500 italic">No events yet.</p>}

      <div className="space-y-4">
        {events?.map((ev) => (
          <EventCard key={ev.id} ev={ev} onChanged={load} onJoined={onJoined} />
        ))}
      </div>
    </div>
  )
}
