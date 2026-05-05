import { useState } from 'react'
import { isoToDatetimeLocal, datetimeLocalToIso, formatClock } from '../lib/helpers'

/**
 * TimeDateEditor — split editor: time prominent, date small/secondary.
 * Used for the time-in editor where most edits are time, not date.
 *
 * Props:
 *  - value: ISO string (e.g. "2026-05-02T17:54:00")
 *  - onCommit: (newIso) => void
 *  - onCancel: () => void
 */
export default function TimeDateEditor({ value, onCommit, onCancel }) {
  const [showDate, setShowDate] = useState(false)
  // Split current value into date and time parts
  const local = isoToDatetimeLocal(value) // "YYYY-MM-DDTHH:MM"
  const [date, setDate] = useState(local.slice(0, 10))
  const [time, setTime] = useState(local.slice(11, 16))

  const commit = () => {
    if (!date || !time) return onCancel?.()
    const newLocal = `${date}T${time}`
    onCommit(datetimeLocalToIso(newLocal))
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
          autoFocus
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

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={commit} className="btn-primary">Save time</button>
      </div>
    </div>
  )
}

function formatDateLabel(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return '—'
  const today = new Date().toISOString().slice(0, 10)
  if (yyyy_mm_dd === today) return 'Today'
  // Calc yesterday
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = y.toISOString().slice(0, 10)
  if (yyyy_mm_dd === yesterday) return 'Yesterday'
  // Otherwise format as dd/mm
  const [, m, d] = yyyy_mm_dd.split('-')
  return `${d}/${m}`
}
