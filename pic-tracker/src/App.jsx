import { useEffect, useState } from 'react'
import EventSettings from './components/EventSettings'
import CareBoard from './components/CareBoard'
import IntakeModal from './components/IntakeModal'
import PicDetailPanel from './components/PicDetailPanel'
import Dashboard from './components/Dashboard'
import Reports from './components/Reports'
import { getEvent, getPics } from './lib/store'

export default function App() {
  const [view, setView] = useState('board')
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activePicId, setActivePicId] = useState(null)
  const [openIntent, setOpenIntent] = useState(null)

  useEffect(() => {
    const e = getEvent()
    const pics = getPics()
    if (!e.name && pics.length === 0) {
      setView('settings')
    }
  }, [])

  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 bg-ink-950/85 backdrop-blur border-b border-ink-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-baseline gap-2 mr-3">
            <span className="font-display font-bold text-lg tracking-tight">PIC</span>
            <span className="font-display font-bold text-lg tracking-tight text-ink-400">tracker</span>
          </div>
          <nav className="flex gap-1">
            <NavButton active={view === 'board'} onClick={() => setView('board')}>
              Board
            </NavButton>
            <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')}>
              Dashboard
            </NavButton>
            <NavButton active={view === 'reports'} onClick={() => setView('reports')}>
              Reports
            </NavButton>
            <NavButton active={view === 'settings'} onClick={() => setView('settings')}>
              Settings
            </NavButton>
          </nav>
          <div className="ml-auto text-xs text-ink-500 font-display tracking-wider hidden sm:block">
            v0.3 · phase 3
          </div>
        </div>
      </header>

      {view === 'board' && (
        <CareBoard
          refreshKey={refreshKey}
          onAddPic={() => setIntakeOpen(true)}
          onPicClick={(pic) => {
            setOpenIntent(null)
            setActivePicId(pic.id)
          }}
          onPicTapKpe={(pic) => {
            setOpenIntent('edit_kpe')
            setActivePicId(pic.id)
          }}
        />
      )}
      {view === 'dashboard' && <Dashboard refreshKey={refreshKey} />}
      {view === 'reports' && <Reports refreshKey={refreshKey} />}
      {view === 'settings' && <EventSettings onSaved={refresh} />}

      <IntakeModal
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onCreated={() => refresh()}
      />

      <PicDetailPanel
        picId={activePicId}
        openIntent={openIntent}
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
        active
          ? 'bg-ink-100 text-ink-950'
          : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800'
      }`}
    >
      {children}
    </button>
  )
}
