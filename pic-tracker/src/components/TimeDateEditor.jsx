import { useState, useEffect } from 'react'
import { isoToDatetimeLocal, datetimeLocalToIso } from '../lib/helpers'

/**
 * TimeDateEditor — split editor: time prominent, date small/secondary.
 *
 * Two modes:
 *  - 'committed' (default): shows Cancel + Save buttons; commits via onCommit only on Save.
 *    Use when wrapping in an EditableCell or any UI that needs explicit confirm.
 *  - 'live': no buttons; calls onCommit immediately on every change.
 *    Use when the editor is already inside a larger form (e.g. discharge modal)
 *    where the parent has its own commit affordance.
 *
 * Props:
 *  - value: ISO string (e.g. "2026-05-02T17:54:00")
 *  - onCommit: (newIso) => void
 *  - onCancel?: () => void  (only used in 'committed' mode)
 *  - mode?: 'committed' | 'live' (default 'committed')
 */
export default function TimeDateEditor({ value, onCommit, onCancel, mode = 'committed' }) {
  const [showDate, setShowDate] = useState(false)
  const local = isoToDatetimeLocal(value)
  const [date, setDate] = useState(local.slice(0, 10))
  const [time, setTime] = useState(local.slice(11, 16))

  // Sync internal state when value prop changes from outside (e.g. parent's "reset to now")
  // Only sync if the new ISO doesn't match what we'd produce — avoids feedback loops
  // when our own onCommit triggers a parent re-render.
  useEffect(() => {
    const incoming = isoToDatetimeLocal(value)
    const incomingDate = incoming.slice(0, 10)
    const incomingTime = incoming.slice(11, 16)
    if (incomingDate !== date || incomingTime !== time) {
      // Decide whether this is an external change or echo of our own update
      // Our own update: incoming matches what we'd build from current state
      // External change: incoming differs from both
      const ourBuiltLocal = `${date}T${time}`
      // If the external value matches our own latest build, skip sync (it's our echo)
      if (incoming === ourBuiltLocal) return
      setDate(incomingDate)
      setTime(incomingTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // In live mode: emit a new ISO whenever date or time changes
  useEffect(() => {
    if (mode !== 'live') return
    if (!date || !time) return
    onCommit(datetimeLocalToIso(`${date}T${time}`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, mode])

  const commit = () => {
    if (!date || !time) return onCancel?.()
    onCommit(datetimeLocalToIso(`${date}T${time}`))
  }

  return (
    <div className="space-y-3">
      {/* Time — prominent */}
      <div>
        <input
          type="time"
          className="input text-2xl font-display tabular-nums text-center py-3"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          autoFocus={mode === 'committed'}
        />
      </div>

      {/* Date — small, click to expand */}
      <div className="text-xs">
        {showDate ? (
          <input
            type="date"
            className="input text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={() => setShowDate(false)}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowDate(true)}
            className="text-ink-400 hover:text-ink-100 underline-offset-4 hover:underline"
          >
            Date: {formatDateLabel(date)} · change
          </button>
        )}
      </div>

      {/* Buttons only in committed mode */}
      {mode === 'committed' && (
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={commit} className="btn-primary">Save time</button>
        </div>
      )}
    </div>
  )
}

function formatDateLabel(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return '—'
  const today = new Date().toISOString().slice(0, 10)
  if (yyyy_mm_dd === today) return 'Today'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = y.toISOString().slice(0, 10)
  if (yyyy_mm_dd === yesterday) return 'Yesterday'
  const [, m, d] = yyyy_mm_dd.split('-')
  return `${d}/${m}`
}
