import { useEffect, useMemo, useState } from 'react'
import { getEvent, saveEvent, getPics } from '../lib/store'
import { getAssignedKpe } from '../lib/helpers'
import RosterField from './RosterField'
import { getStoredTheme, setTheme as applyAndStoreTheme, getStoredSize, setSize as applyAndStoreSize, resolveTheme } from '../lib/theme'
import { updateCurrentEvent, updateCurrentEventTls } from '../lib/supabaseStore'
import { SUPABASE_CONFIGURED } from '../lib/supabaseClient'
import { isWriter, updateCachedEventName } from '../lib/eventSession'

export default function EventSettings({ onSaved }) {
  const [name, setName] = useState('')
  const [shift1, setShift1] = useState([])
  const [shift2, setShift2] = useState([])
  const [tls, setTls] = useState([])
  const [interval, setInterval] = useState(15)
  const [capacity, setCapacity] = useState('')
  const [savedAt, setSavedAt] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [pics, setPics] = useState([])

  useEffect(() => {
    const e = getEvent()
    setName(e.name || '')
    setShift1(e.shift1Team || [])
    setShift2(e.shift2Team || [])
    setTls(e.tls || [])
    setInterval(e.code3CheckIntervalMinutes || 15)
    setCapacity(e.capacity == null ? '' : String(e.capacity))
    setPics(getPics() || [])
  }, [])

  // KPE names that have been used on a PIC this event but aren't on either team.
  const unassigned = useMemo(() => {
    const rostered = new Set([...shift1, ...shift2])
    const seen = new Set()
    const out = []
    for (const p of pics) {
      for (const nm of [getAssignedKpe(p), p.intakeKpe]) {
        const clean = (nm || '').trim()
        if (clean && !rostered.has(clean) && !seen.has(clean)) {
          seen.add(clean)
          out.push(clean)
        }
      }
    }
    return out
  }, [pics, shift1, shift2])

  const addUnassignedTo = (name, team) => {
    if (team === 1) {
      if (!shift1.includes(name)) setShift1([...shift1, name])
    } else {
      if (!shift2.includes(name)) setShift2([...shift2, name])
    }
    markDirty()
  }

  const markDirty = () => setDirty(true)

  // Toggle a name's Team Lead status.
  const toggleTl = (nameToToggle) => {
    setTls((prev) =>
      prev.includes(nameToToggle)
        ? prev.filter((n) => n !== nameToToggle)
        : [...prev, nameToToggle]
    )
    markDirty()
  }

  // Drop any TL flags whose name is no longer on either roster.
  const pruneTls = (s1, s2) => {
    setTls((prev) => prev.filter((n) => s1.includes(n) || s2.includes(n)))
  }

  const handleSave = () => {
    const capNumber = capacity === '' ? null : Number(capacity)
    // Only keep TL flags for names still on a roster.
    const cleanTls = tls.filter((n) => shift1.includes(n) || shift2.includes(n))
    const eventData = {
      name: name.trim(),
      shift1Team: shift1,
      shift2Team: shift2,
      tls: cleanTls,
      code3CheckIntervalMinutes: Number(interval) || 15,
      capacity: capNumber && capNumber > 0 ? capNumber : null,
    }
    saveEvent(eventData)
    setTls(cleanTls)
    setSavedAt(new Date())
    setDirty(false)
    // Mirror to Supabase (writer-only, no-op otherwise). TLs mirror separately
    // so a missing `tls` column can't block the rest of the settings.
    if (SUPABASE_CONFIGURED && isWriter()) {
      updateCurrentEvent(eventData).catch((e) => console.error('event mirror failed', e))
      updateCurrentEventTls(cleanTls).catch((e) => console.error('tls mirror failed', e))
      updateCachedEventName(eventData.name)
    }
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
          <h3 className="font-display font-semibold text-lg">Team 1</h3>
          <span className="text-xs text-ink-500 ml-auto">
            {shift1.length} on team{shift1.filter((n) => tls.includes(n)).length > 0 && ` · ${shift1.filter((n) => tls.includes(n)).length} lead`}
          </span>
        </div>
        <RosterField
          names={shift1}
          onChange={(v) => {
            setShift1(v)
            pruneTls(v, shift2)
            markDirty()
          }}
          accentClass="bg-shift-1"
          placeholder="Add Team 1 member…"
          tlNames={tls}
          onToggleTl={toggleTl}
        />
      </section>

      <section className="panel p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-shift-2" />
          <h3 className="font-display font-semibold text-lg">Team 2</h3>
          <span className="text-xs text-ink-500 ml-auto">
            {shift2.length} on team{shift2.filter((n) => tls.includes(n)).length > 0 && ` · ${shift2.filter((n) => tls.includes(n)).length} lead`}
          </span>
        </div>
        <RosterField
          names={shift2}
          onChange={(v) => {
            setShift2(v)
            pruneTls(shift1, v)
            markDirty()
          }}
          accentClass="bg-shift-2"
          placeholder="Add Team 2 member…"
          tlNames={tls}
          onToggleTl={toggleTl}
        />
      </section>

      {unassigned.length > 0 && (
        <section className="panel p-6 space-y-4 border-dashed">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-ink-500" />
            <h3 className="font-display font-semibold text-lg">Unassigned</h3>
            <span className="text-xs text-ink-500 ml-auto">{unassigned.length} in use</span>
          </div>
          <p className="text-xs text-ink-500">
            Names entered as a KPE during intake that aren’t on a team yet. Add
            them to a team to keep the roster tidy.
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1 text-sm font-medium bg-ink-800 border border-ink-700 text-ink-100"
              >
                {n}
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => addUnassignedTo(n, 1)}
                    className="text-[11px] font-display font-bold px-2 py-0.5 rounded-full bg-shift-1/15 border border-shift-1/50 text-shift-1 hover:bg-shift-1/30 transition"
                    title={`Add ${n} to Team 1`}
                  >
                    + Team 1
                  </button>
                  <button
                    type="button"
                    onClick={() => addUnassignedTo(n, 2)}
                    className="text-[11px] font-display font-bold px-2 py-0.5 rounded-full bg-shift-2/15 border border-shift-2/50 text-shift-2 hover:bg-shift-2/30 transition"
                    title={`Add ${n} to Team 2`}
                  >
                    + Team 2
                  </button>
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

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
