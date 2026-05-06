import { useEffect, useState } from 'react'
import { getEvent, saveEvent } from '../lib/store'
import RosterField from './RosterField'
import { getStoredTheme, setTheme as applyAndStoreTheme, getStoredSize, setSize as applyAndStoreSize, resolveTheme } from '../lib/theme'

export default function EventSettings({ onSaved }) {
  const [name, setName] = useState('')
  const [shift1, setShift1] = useState([])
  const [shift2, setShift2] = useState([])
  const [interval, setInterval] = useState(15)
  const [capacity, setCapacity] = useState('')
  const [savedAt, setSavedAt] = useState(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const e = getEvent()
    setName(e.name || '')
    setShift1(e.shift1Team || [])
    setShift2(e.shift2Team || [])
    setInterval(e.code3CheckIntervalMinutes || 15)
    setCapacity(e.capacity == null ? '' : String(e.capacity))
  }, [])

  const markDirty = () => setDirty(true)

  const handleSave = () => {
    const capNumber = capacity === '' ? null : Number(capacity)
    saveEvent({
      name: name.trim(),
      shift1Team: shift1,
      shift2Team: shift2,
      code3CheckIntervalMinutes: Number(interval) || 15,
      capacity: capNumber && capNumber > 0 ? capNumber : null,
    })
    setSavedAt(new Date())
    setDirty(false)
    onSaved?.()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">
          / event setup
        </p>
        <h2 className="text-3xl font-display font-bold text-ink-100">Event settings</h2>
        <p className="text-ink-400 text-sm max-w-prose">
          Configure the event name and rosters for both shifts. KPE autocomplete on the intake form draws from these lists.
        </p>
      </header>

      <section className="panel p-6 space-y-5">
        <div>
          <label className="label">Event name</label>
          <input
            className="input"
            placeholder="e.g. Lost Paradise 2026"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              markDirty()
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label">Carespace capacity (spaces)</label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Leave blank for unlimited"
              value={capacity}
              onChange={(e) => {
                setCapacity(e.target.value)
                markDirty()
              }}
            />
            <p className="text-xs text-ink-500 mt-2">
              Max PICs in care at once. Adjust anytime during an event.
            </p>
          </div>

          <div>
            <label className="label">Code 3 check interval (mins)</label>
            <input
              className="input"
              type="number"
              min="1"
              max="120"
              value={interval}
              onChange={(e) => {
                setInterval(e.target.value)
                markDirty()
              }}
            />
            <p className="text-xs text-ink-500 mt-2">
              How often Code 3 PICs need a welfare check.
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-shift-1" />
          <h3 className="font-display font-semibold text-lg">Shift 1 roster</h3>
          <span className="text-xs text-ink-500 ml-auto">{shift1.length} on team</span>
        </div>
        <RosterField
          names={shift1}
          onChange={(v) => {
            setShift1(v)
            markDirty()
          }}
          accentClass="bg-shift-1"
          placeholder="Add shift 1 KPE…"
        />
      </section>

      <section className="panel p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-shift-2" />
          <h3 className="font-display font-semibold text-lg">Shift 2 roster</h3>
          <span className="text-xs text-ink-500 ml-auto">{shift2.length} on team</span>
        </div>
        <RosterField
          names={shift2}
          onChange={(v) => {
            setShift2(v)
            markDirty()
          }}
          accentClass="bg-shift-2"
          placeholder="Add shift 2 KPE…"
        />
      </section>

      <DisplaySection />

      <div className="sticky bottom-4 flex items-center gap-4 bg-ink-900/80 backdrop-blur border border-ink-800 rounded-xl p-3 pl-5">
        <div className="text-sm text-ink-400">
          {dirty ? (
            <span className="text-code-3 font-semibold">Unsaved changes</span>
          ) : savedAt ? (
            <span>Saved {savedAt.toLocaleTimeString()}</span>
          ) : (
            <span>Not yet saved this session</span>
          )}
        </div>
        <button className="btn-primary ml-auto" onClick={handleSave} disabled={!dirty && !savedAt}>
          Save settings
        </button>
      </div>
    </div>
  )
}

// --- DisplaySection: theme + font size preferences (saved instantly, no Save button) ---

function DisplaySection() {
  const [theme, setLocalTheme] = useState(getStoredTheme())
  const [size, setLocalSize] = useState(getStoredSize())

  const onPickTheme = (t) => {
    applyAndStoreTheme(t)
    setLocalTheme(t)
  }
  const onPickSize = (s) => {
    applyAndStoreSize(s)
    setLocalSize(s)
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: '☾' },
    { value: 'light', label: 'Light', icon: '☀' },
    { value: 'system', label: 'Auto', icon: '◐' },
  ]
  const sizeOptions = [
    { value: 'small', label: 'Small', sample: 'A' },
    { value: 'normal', label: 'Normal', sample: 'A' },
    { value: 'large', label: 'Large', sample: 'A' },
  ]

  const sizeSampleClasses = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-xl',
  }

  return (
    <section className="panel p-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-ink-400" />
        <h3 className="font-display font-semibold text-lg">Display</h3>
        <span className="text-xs text-ink-500 ml-auto">applies instantly · per-device</span>
      </div>

      <div>
        <label className="label">Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onPickTheme(opt.value)}
                className={`h-14 rounded-xl border-2 font-display font-semibold transition flex flex-col items-center justify-center gap-0.5 ${
                  active
                    ? 'bg-ink-100 text-ink-950 border-white shadow'
                    : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
                }`}
              >
                <span className="text-base leading-none">{opt.icon}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            )
          })}
        </div>
        {theme === 'system' && (
          <p className="text-xs text-ink-500 mt-2">
            Auto follows your OS setting (currently {resolveTheme('system')}).
          </p>
        )}
      </div>

      <div>
        <label className="label">Font size</label>
        <div className="grid grid-cols-3 gap-2">
          {sizeOptions.map((opt) => {
            const active = size === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onPickSize(opt.value)}
                className={`h-14 rounded-xl border-2 font-display font-semibold transition flex items-center justify-center gap-2 ${
                  active
                    ? 'bg-ink-100 text-ink-950 border-white shadow'
                    : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
                }`}
              >
                <span className={sizeSampleClasses[opt.value]}>{opt.sample}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-ink-500 mt-2">
          Adjusts text size everywhere in the app.
        </p>
      </div>
    </section>
  )
}
