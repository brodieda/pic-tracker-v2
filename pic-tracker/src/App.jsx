import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import EventSettings from './components/EventSettings'
import CareBoard from './components/CareBoard'
import FloorCheck from './components/FloorCheck'
import IntakeModal from './components/IntakeModal'
import PicDetailPanel from './components/PicDetailPanel'
import Dashboard from './components/Dashboard'
import Reports from './components/Reports'
import ThemeToggle from './components/ThemeToggle'
import LandingScreen from './components/LandingScreen'
import IntakeOnlyScreen from './components/IntakeOnlyScreen'
import GlobalSearch from './components/GlobalSearch'
import ActivityBell from './components/ActivityBell'
import SessionMenu, { SessionMenuContent } from './components/SessionMenu'
import { getEvent, getPics, getEvents } from './lib/store'
import { linkConvertedFriend } from './lib/helpers'
import { getActorName } from './lib/actorName'
import { hasJoined, getSession, clearSession } from './lib/eventSession'
import { SUPABASE_CONFIGURED } from './lib/supabaseClient'
import { startBackgroundSync, stopBackgroundSync, backgroundSync } from './lib/syncEngine'

// How far back an admit can be and still trigger the cross-device toast on
// this tab's first sync — covers the case where you check a second device
// moments after admitting on another one, and that admit is already synced
// by the time this tab loads.
const ADMIT_TOAST_GRACE_MS = 45_000

export default function App() {
  const [view, setView] = useState('board')
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activePicId, setActivePicId] = useState(null)
  const [openIntent, setOpenIntent] = useState(null)
  const [joined, setJoined] = useState(!SUPABASE_CONFIGURED || hasJoined())
  const [refreshing, setRefreshing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState(null) // { text, ok } | null
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [convertContext, setConvertContext] = useState(null) // { originalPicId, friendId, name } | null
  const [admitToast, setAdmitToast] = useState(null) // { picId, picNumber, name, actorName } | null
  const toastedAdmitIdsRef = useRef(new Set())
  const mountTimeRef = useRef(Date.now())

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

  // --- Cross-device admit toast ---
  // Fires only for admit events created by a different actor than this
  // device — your own admits never toast, you were just there.
  //
  // Rather than treating "everything present on first load" as already
  // seen (which would silently swallow an admit that happened moments
  // before this tab's first sync — the exact sequence you get when
  // checking a second device right after admitting on another one), we
  // only suppress admits older than a short grace window at mount. Once
  // running, every admit is evaluated regardless of when it arrived.
  useEffect(() => {
    if (!joined) return
    const events = getEvents()
    const myName = getActorName()
    const cutoff = mountTimeRef.current - ADMIT_TOAST_GRACE_MS
    const admits = events.filter((e) => e.type === 'admit')
    const fresh = admits.filter(
      (e) => !toastedAdmitIdsRef.current.has(e.id) && new Date(e.timestamp).getTime() >= cutoff,
    )
    if (fresh.length === 0) return
    fresh.forEach((e) => toastedAdmitIdsRef.current.add(e.id))
    const fromOthers = fresh.filter((e) => e.actorName && e.actorName !== myName)
    if (fromOthers.length === 0) return
    const latest = fromOthers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    const pics = getPics()
    const pic = pics.find((p) => p.id === latest.picId)
    if (!pic) return
    setAdmitToast({ picId: pic.id, picNumber: pic.number, name: pic.name, actorName: latest.actorName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, joined])

  useEffect(() => {
    if (!admitToast) return
    const t = setTimeout(() => setAdmitToast(null), 6000)
    return () => clearTimeout(t)
  }, [admitToast])

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 sm:gap-4">
          {/* Hamburger — mobile only */}
          <button
            className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md bg-ink-800 border border-ink-700 text-ink-200 shrink-0"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="flex items-baseline gap-2 mr-1 sm:mr-3">
            <span className="font-display font-bold text-lg tracking-tight">PIC</span>
            <span className="font-display font-bold text-lg tracking-tight text-ink-400">tracker</span>
          </div>

          {/* Nav — desktop only (mobile lives in the drawer) */}
          <nav className="hidden sm:flex gap-1">
            <NavButton active={view === 'board'} onClick={() => setView('board')}>Board</NavButton>
            <NavButton active={view === 'floor'} onClick={() => setView('floor')}>Floor</NavButton>
            <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')}>Dashboard</NavButton>
            <NavButton active={view === 'reports'} onClick={() => setView('reports')}>Reports</NavButton>
            <NavButton active={view === 'settings'} onClick={() => setView('settings')}>Settings</NavButton>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Read-only badge stays always-visible — important safety info, not worth a click to see */}
            {isViewer && (
              <span className="hidden sm:inline text-[10px] font-display font-bold uppercase tracking-widest px-2 py-1 rounded bg-shift-2/15 text-shift-2 border border-shift-2/40">
                Read only
              </span>
            )}

            {/* Search — always visible */}
            <GlobalSearch onOpenPic={(id) => setActivePicId(id)} />

            {/* Activity — overdue welfare checks + full event feed */}
            <ActivityBell refreshKey={refreshKey} onOpenPic={(id) => setActivePicId(id)} />

            {/* Live + refresh merged into one icon; dot badges it, hover shows status, click force-refreshes */}
            {SUPABASE_CONFIGURED && (
              <button
                onClick={forceRefresh}
                disabled={refreshing}
                title={
                  connStatus === 'live'
                    ? `Live — synced ${syncedAgoLabel} — click to refresh`
                    : connStatus === 'syncing'
                    ? 'Syncing…'
                    : `Offline / stale — last synced ${syncedAgoLabel} — click to refresh`
                }
                aria-label="Refresh data"
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-md bg-ink-800 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 transition disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
                <span
                  className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                    connStatus === 'live'
                      ? 'bg-code-5'
                      : connStatus === 'syncing'
                      ? 'bg-code-3 animate-pulse'
                      : 'bg-ink-500'
                  }`}
                />
              </button>
            )}

            {/* Desktop-only: Writer/Actor/Theme/Version collapsed behind one avatar menu */}
            <div className="hidden sm:block">
              <SessionMenu onLeave={() => setJoined(false)} />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer — everything that used to crowd the top */}
      {drawerOpen &&
        createPortal(
          <div className="sm:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-ink-950/60" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[82%] bg-ink-900 border-r border-ink-800 shadow-2xl flex flex-col p-4 gap-5 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-lg tracking-tight">PIC</span>
                  <span className="font-display font-bold text-lg tracking-tight text-ink-400">tracker</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <div>
                <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1.5">Go to</div>
                <div className="space-y-1">
                  {[
                    ['board', 'Board'],
                    ['floor', 'Floor'],
                    ['dashboard', 'Dashboard'],
                    ['reports', 'Reports'],
                    ['settings', 'Settings'],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => { setView(v); setDrawerOpen(false) }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg font-display font-semibold transition ${
                        view === v ? 'bg-ink-100 text-ink-950' : 'text-ink-200 hover:bg-ink-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {SUPABASE_CONFIGURED && (
                <div className="space-y-2">
                  <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500">Session</div>
                  {isViewer && (
                    <span className="inline-block text-[10px] font-display font-bold uppercase tracking-widest px-2 py-1 rounded bg-shift-2/15 text-shift-2 border border-shift-2/40">
                      Read only
                    </span>
                  )}
                  <SessionMenuContent onLeave={() => { setDrawerOpen(false); setJoined(false) }} />
                </div>
              )}

              {!SUPABASE_CONFIGURED && (
                <div className="mt-auto flex items-center gap-3 pt-3 border-t border-ink-800 text-ink-400">
                  <ThemeToggle />
                  <span className="text-xs font-display tracking-wider">v0.6</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

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
        onClose={() => {
          setIntakeOpen(false)
          setConvertContext(null)
        }}
        initialValues={
          convertContext ? { name: convertContext.name, referredBy: ['Friend'] } : undefined
        }
        onCreated={(newPic) => {
          if (convertContext) {
            linkConvertedFriend(convertContext.originalPicId, convertContext.friendId, newPic.id)
            setConvertContext(null)
          }
          refresh()
        }}
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
        onConvertFriend={
          isViewer
            ? undefined
            : (pic, friend) => {
                setConvertContext({ originalPicId: pic.id, friendId: friend.id, name: friend.name })
                setIntakeOpen(true)
              }
        }
      />

      {admitToast && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl pl-3 pr-2.5 py-2.5 text-sm shadow-2xl bg-ink-900 border border-ink-700 max-w-sm">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-code-4/20 text-code-4 shrink-0">
              +
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-display font-bold text-ink-100 truncate">
                #{admitToast.picNumber} {admitToast.name || ''} admitted
              </span>
              <span className="block text-[11px] text-ink-500 truncate">by {admitToast.actorName}</span>
            </span>
            <button
              onClick={() => {
                setActivePicId(admitToast.picId)
                setAdmitToast(null)
              }}
              className="bg-ink-100 text-ink-950 rounded-md px-2.5 py-1.5 text-xs font-display font-bold shrink-0"
            >
              View
            </button>
            <button
              onClick={() => setAdmitToast(null)}
              className="text-ink-500 hover:text-ink-200 text-sm px-1 shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
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
