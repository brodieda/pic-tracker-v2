import { useEffect, useState } from 'react'
import EventSettings from './components/EventSettings'
import CareBoard from './components/CareBoard'
import FloorCheck from './components/FloorCheck'
import IntakeModal from './components/IntakeModal'
import PicDetailPanel from './components/PicDetailPanel'
import Dashboard from './components/Dashboard'
import Reports from './components/Reports'
import ThemeToggle from './components/ThemeToggle'
import LandingScreen from './components/LandingScreen'
import CodesBadge from './components/CodesBadge'
import ActorNameBadge from './components/ActorNameBadge'
import IntakeOnlyScreen from './components/IntakeOnlyScreen'
import { getEvent, getPics, getEvents } from './lib/store'
import { code3MonitorStateFor, currentCodeFor } from './lib/helpers'
import { hasJoined, getSession, clearSession } from './lib/eventSession'
import { SUPABASE_CONFIGURED } from './lib/supabaseClient'
import { startBackgroundSync, stopBackgroundSync, backgroundSync } from './lib/syncEngine'

export default function App() {
  const [view, setView] = useState('board')
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activePicId, setActivePicId] = useState(null)
  const [openIntent, setOpenIntent] = useState(null)
  const [joined, setJoined] = useState(!SUPABASE_CONFIGURED || hasJoined())
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null) // { text, ok } | null
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [overdueDismissedAt, setOverdueDismissedAt] = useState(0)

  // Auto-dismiss the refresh confirmation.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // Track online/offline + a slow tick so the connection dot and overdue
  // counts stay current even when no sync is landing.
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      clearInterval(id)
    }
  }, [])

  const sessionRole = SUPABASE_CONFIGURED ? getSession().role : 'writer'
  const isViewer = sessionRole === 'viewer'
  const isIntakeOnly = sessionRole === 'intake_only'

  useEffect(() => {
    if (!joined) return
    if (isViewer || isIntakeOnly) return
    const e = getEvent()
    const pics = getPics()
    if (!e.name && pics.length === 0) {
      setView('settings')
    }
  }, [joined, isViewer, isIntakeOnly])

  // Background sync — skip for intake-only (they have no read access).
  useEffect(() => {
    if (!SUPABASE_CONFIGURED || !joined) return
    if (isIntakeOnly) return
    const intervalMs = isViewer ? 3000 : 5000
    startBackgroundSync({
      intervalMs,
      immediate: true,
      onSync: () => {
        setLastSyncAt(Date.now())
        setRefreshKey((k) => k + 1)
      },
      onSessionInvalid: async () => {
        // Event ended, code rotated, or session otherwise killed by the
        // server. Clear local state and bounce to landing.
        stopBackgroundSync()
        await clearSession()
        alert('This event has ended or your access has been revoked. Returning to start.')
        setJoined(false)
      },
    })
    return () => stopBackgroundSync()
  }, [joined, isViewer, isIntakeOnly])

  const refresh = () => setRefreshKey((k) => k + 1)

  // Manual force-refresh: pull fresh state from Supabase now, overwriting the
  // local cache. This is the reliable way to clear stale data — a browser
  // reload won't, since the cache is in localStorage, not fetched files.
  const forceRefresh = async () => {
    if (refreshing) return
    if (!SUPABASE_CONFIGURED) {
      refresh()
      setToast({ text: 'Refreshed', ok: true })
      return
    }
    setRefreshing(true)
    try {
      const result = await backgroundSync()
      if (!result.ok && result.reason === 'session_invalid') {
        stopBackgroundSync()
        await clearSession()
        alert('This event has ended or your access has been revoked. Returning to start.')
        setJoined(false)
        return
      }
      if (result.ok) {
        setLastSyncAt(Date.now())
        refresh()
        setToast({ text: 'Refreshed — up to date', ok: true })
      } else {
        // Network/other error — data was NOT updated. Surface it rather than
        // failing silently.
        setToast({ text: "Couldn't refresh — check connection", ok: false })
      }
    } catch {
      setToast({ text: "Couldn't refresh — check connection", ok: false })
    } finally {
      setRefreshing(false)
    }
  }

  // --- Connection status (for the header dot) ---
  const syncIntervalMs = isViewer ? 3000 : 5000
  const syncedAgoMs = lastSyncAt ? now - lastSyncAt : null
  const stale = syncedAgoMs == null || syncedAgoMs > syncIntervalMs * 3
  const connStatus = refreshing ? 'syncing' : !online || stale ? 'offline' : 'live'
  const syncedAgoLabel = (() => {
    if (syncedAgoMs == null) return 'not yet synced'
    const s = Math.round(syncedAgoMs / 1000)
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ago`
  })()

  // --- Attention alerts (overdue welfare checks + high-acuity in care) ---
  const alerts = useMemo(() => {
    const pics = getPics()
    const events = getEvents()
    const cfg = getEvent()
    let overdue = 0
    let acuity = 0
    for (const p of pics) {
      if (p.status !== 'in_care') continue
      if (code3MonitorStateFor(p.id, events, cfg, Date.now()) === 'overdue') overdue++
      const c = currentCodeFor(p.id, events)
      if (c === 1 || c === 2) acuity++
    }
    return { overdue, acuity, total: overdue + acuity }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, now])

  // Reset the dismissal once everything's clear, so new alerts re-show.
  useEffect(() => {
    if (alerts.total === 0 && overdueDismissedAt !== 0) setOverdueDismissedAt(0)
  }, [alerts.total, overdueDismissedAt])

  const showAlertBar = alerts.total > 0 && alerts.total > overdueDismissedAt
  const alertText = (() => {
    const parts = []
    if (alerts.overdue > 0) parts.push(`${alerts.overdue} check${alerts.overdue > 1 ? 's' : ''} overdue`)
    if (alerts.acuity > 0) parts.push(`${alerts.acuity} high-acuity (code 1–2)`)
    return parts.join(' · ')
  })()

  if (SUPABASE_CONFIGURED && !joined) {
    return <LandingScreen onJoined={() => setJoined(true)} />
  }

  // Intake-only users get their own dedicated UI with no nav.
  if (isIntakeOnly) {
    return <IntakeOnlyScreen />
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 bg-ink-950/85 backdrop-blur border-b border-ink-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-0 sm:h-14 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-2 mr-1 sm:mr-3 order-1">
            <span className="font-display font-bold text-lg tracking-tight">PIC</span>
            <span className="font-display font-bold text-lg tracking-tight text-ink-400">tracker</span>
          </div>
          <nav className="order-last sm:order-2 w-full sm:w-auto flex gap-1 overflow-x-auto">
            <NavButton active={view === 'board'} onClick={() => setView('board')}>Board</NavButton>
            <NavButton active={view === 'floor'} onClick={() => setView('floor')}>Floor</NavButton>
            <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')}>Dashboard</NavButton>
            <NavButton active={view === 'reports'} onClick={() => setView('reports')}>Reports</NavButton>
            <NavButton active={view === 'settings'} onClick={() => setView('settings')}>Settings</NavButton>
          </nav>
          <div className="order-2 sm:order-3 ml-auto flex items-center gap-2">
            {isViewer && (
              <span className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-1 rounded bg-shift-2/15 text-shift-2 border border-shift-2/40">
                Read only
              </span>
            )}
            {SUPABASE_CONFIGURED && (
              <CodesBadge onLeave={() => setJoined(false)} />
            )}
            {SUPABASE_CONFIGURED && <ActorNameBadge />}
            {SUPABASE_CONFIGURED && (
              <span
                className="inline-flex items-center gap-1.5 pl-1"
                title={
                  connStatus === 'live'
                    ? `Live — synced ${syncedAgoLabel}`
                    : connStatus === 'syncing'
                    ? 'Syncing…'
                    : `Offline / stale — last synced ${syncedAgoLabel}`
                }
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    connStatus === 'live'
                      ? 'bg-code-5'
                      : connStatus === 'syncing'
                      ? 'bg-code-3 animate-pulse'
                      : 'bg-ink-500'
                  }`}
                />
                <span className="text-[10px] font-display uppercase tracking-widest text-ink-500 hidden md:inline">
                  {connStatus === 'live' ? 'Live' : connStatus === 'syncing' ? 'Sync' : 'Offline'}
                </span>
              </span>
            )}
            {SUPABASE_CONFIGURED && (
              <button
                onClick={forceRefresh}
                disabled={refreshing}
                title="Refresh"
                aria-label="Refresh data"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-ink-800 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 transition disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
            )}
            <ThemeToggle />
            <span className="text-xs text-ink-500 font-display tracking-wider hidden sm:inline">
              v0.6
            </span>
          </div>
        </div>
      </header>

      {view === 'board' && (
        <CareBoard
          refreshKey={refreshKey}
          onAddPic={isViewer ? null : () => setIntakeOpen(true)}
          onPicClick={(pic) => {
            setOpenIntent(null)
            setActivePicId(pic.id)
          }}
          onPicTapKpe={isViewer
            ? (pic) => { setOpenIntent(null); setActivePicId(pic.id) }
            : (pic) => { setOpenIntent('edit_kpe'); setActivePicId(pic.id) }
          }
        />
      )}
      {view === 'floor' && (
        <FloorCheck
          refreshKey={refreshKey}
          onPicClick={(id) => {
            setOpenIntent(null)
            setActivePicId(id)
          }}
        />
      )}
      {view === 'dashboard' && <Dashboard refreshKey={refreshKey} />}
      {view === 'reports' && (
        <Reports
          refreshKey={refreshKey}
          onPicClick={(id) => {
            setOpenIntent(null)
            setActivePicId(id)
          }}
        />
      )}
      {view === 'settings' && <EventSettings onSaved={refresh} readOnly={isViewer} />}

      <IntakeModal
        open={intakeOpen && !isViewer}
        onClose={() => setIntakeOpen(false)}
        onCreated={() => refresh()}
      />

      <PicDetailPanel
        picId={activePicId}
        openIntent={openIntent}
        readOnly={isViewer}
        onClose={() => {
          setActivePicId(null)
          setOpenIntent(null)
        }}
        onMutated={refresh}
      />

      {(showAlertBar || toast) && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
          {showAlertBar && (
            <div className="pointer-events-auto flex items-center gap-3 rounded-full pl-4 pr-2 py-2 text-sm font-display font-semibold shadow-lg bg-code-1/15 border border-code-1/50 text-code-1">
              <span>⚠ {alertText}</span>
              <button
                onClick={() => {
                  setView('floor')
                  setOverdueDismissedAt(alerts.total)
                }}
                className="rounded-full bg-code-1 text-white px-3 py-1 text-xs font-bold hover:opacity-90"
              >
                View
              </button>
              <button
                onClick={() => setOverdueDismissedAt(alerts.total)}
                className="px-2 text-code-1/70 hover:text-code-1 text-base leading-none"
                aria-label="Dismiss"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
          {toast && (
            <div
              role="status"
              className={`pointer-events-auto flex items-center gap-2 rounded-full pl-3 pr-4 py-2 text-sm font-display font-semibold shadow-lg border ${
                toast.ok
                  ? 'bg-ink-800 border-ink-700 text-ink-100'
                  : 'bg-code-1/15 border-code-1/50 text-code-1'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                  toast.ok ? 'bg-code-5 text-white' : 'bg-code-1 text-white'
                }`}
                aria-hidden="true"
              >
                {toast.ok ? '✓' : '!'}
              </span>
              {toast.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-display font-semibold tracking-wide transition ${
        active ? 'bg-ink-100 text-ink-950' : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800'
      }`}
    >
      {children}
    </button>
  )
}
