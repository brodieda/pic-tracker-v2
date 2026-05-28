import { useEffect, useState } from 'react'
import EventSettings from './components/EventSettings'
import CareBoard from './components/CareBoard'
import IntakeModal from './components/IntakeModal'
import PicDetailPanel from './components/PicDetailPanel'
import Dashboard from './components/Dashboard'
import Reports from './components/Reports'
import ThemeToggle from './components/ThemeToggle'
import LandingScreen from './components/LandingScreen'
import CodesBadge from './components/CodesBadge'
import IntakeOnlyScreen from './components/IntakeOnlyScreen'
import { getEvent, getPics } from './lib/store'
import { hasJoined, getSession } from './lib/eventSession'
import { SUPABASE_CONFIGURED } from './lib/supabaseClient'
import { startBackgroundSync, stopBackgroundSync } from './lib/syncEngine'

export default function App() {
  const [view, setView] = useState('board')
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activePicId, setActivePicId] = useState(null)
  const [openIntent, setOpenIntent] = useState(null)
  const [joined, setJoined] = useState(!SUPABASE_CONFIGURED || hasJoined())

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
      onSync: () => setRefreshKey((k) => k + 1),
    })
    return () => stopBackgroundSync()
  }, [joined, isViewer, isIntakeOnly])

  const refresh = () => setRefreshKey((k) => k + 1)

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-baseline gap-2 mr-3">
            <span className="font-display font-bold text-lg tracking-tight">PIC</span>
            <span className="font-display font-bold text-lg tracking-tight text-ink-400">tracker</span>
          </div>
          <nav className="flex gap-1">
            <NavButton active={view === 'board'} onClick={() => setView('board')}>Board</NavButton>
            <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')}>Dashboard</NavButton>
            <NavButton active={view === 'reports'} onClick={() => setView('reports')}>Reports</NavButton>
            <NavButton active={view === 'settings'} onClick={() => setView('settings')}>Settings</NavButton>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {isViewer && (
              <span className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-1 rounded bg-shift-2/15 text-shift-2 border border-shift-2/40">
                Read only
              </span>
            )}
            {SUPABASE_CONFIGURED && (
              <CodesBadge onLeave={() => setJoined(false)} />
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
      {view === 'dashboard' && <Dashboard refreshKey={refreshKey} />}
      {view === 'reports' && <Reports refreshKey={refreshKey} />}
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
