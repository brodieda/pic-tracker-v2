import { useEffect, useState } from 'react'
import { getEvent, saveEvent } from '../lib/store'
import RosterField from './RosterField'

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
            <label className="label">Carespace capacity (beds)</label>
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
