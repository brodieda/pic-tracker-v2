import { useState, useEffect, useRef } from 'react'
import { isoToDatetimeLocal, datetimeLocalToIso } from '../lib/helpers'

/**
 * TimeDateEditor — manual HH:MM text entry + nudge buttons, no native OS
 * time/date pickers. Native `<input type="time">` / `<input type="date">`
 * render wildly differently across browsers, are fiddly to land on an exact
 * minute with (especially iOS's wheel picker), and reliably trigger the
 * browser to scroll the page to bring the input into view when focused —
 * without necessarily scrolling back afterwards. Plain text input sidesteps
 * all of that: no OS picker overlay, no unexpected scroll, and typing four
 * digits is faster than dialling a wheel to the right minute anyway.
 *
 * Two modes:
 *  - 'committed' (default): shows Cancel + Save buttons; commits via onCommit only on Save.
 *  - 'live': no buttons; calls onCommit immediately on every valid change.
 *
 * Props:
 *  - value: ISO string
 *  - onCommit: (newIso) => void
 *  - onCancel?: () => void  (only used in 'committed' mode)
 *  - mode?: 'committed' | 'live' (default 'committed')
 */
export default function TimeDateEditor({ value, onCommit, onCancel, mode = 'committed' }) {
  const [showDate, setShowDate] = useState(false)
  const local = isoToDatetimeLocal(value)
  const [date, setDate] = useState(local.slice(0, 10))
  const [timeText, setTimeText] = useState(local.slice(11, 16))
  const inputRef = useRef(null)

  useEffect(() => {
    const incoming = isoToDatetimeLocal(value)
    const incomingDate = incoming.slice(0, 10)
    const incomingTime = incoming.slice(11, 16)
    const ourBuiltLocal = `${date}T${timeText}`
    if (incoming === ourBuiltLocal) return
    if (incomingDate !== date) setDate(incomingDate)
    if (incomingTime !== timeText) setTimeText(incomingTime)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const isValidTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(timeText)

  const commitIfLive = (nextDate, nextTime) => {
    if (mode !== 'live') return
    if (!nextDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(nextTime)) return
    onCommit(datetimeLocalToIso(`${nextDate}T${nextTime}`))
  }

  // Formats raw digits as the user types: "1" -> "1", "17" -> "17", "175" -> "17:5", "1754" -> "17:54"
  const onTimeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    let next = digits
    if (digits.length >= 3) next = `${digits.slice(0, 2)}:${digits.slice(2)}`
    setTimeText(next)
    if (next.length === 5) commitIfLive(date, next)
  }

  const nudge = (minutes) => {
    if (!isValidTime) return
    const [h, m] = timeText.split(':').map(Number)
    const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440
    const next = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    setTimeText(next)
    commitIfLive(date, next)
  }

  const commit = () => {
    if (!date || !isValidTime) return onCancel?.()
    onCommit(datetimeLocalToIso(`${date}T${timeText}`))
  }

  return (
    <div className="space-y-3">
      {/* Time — manual entry, no native picker */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => nudge(-5)}
          className="btn-ghost w-9 h-9 !p-0 text-sm shrink-0"
          title="-5 minutes"
        >
          −5
        </button>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="HH:MM"
          className={`input text-2xl font-display tabular-nums text-center py-3 w-32 ${
            timeText && !isValidTime ? 'border-code-1' : ''
          }`}
          value={timeText}
          onChange={onTimeChange}
          onBlur={() => mode === 'live' && commitIfLive(date, timeText)}
          autoFocus={mode === 'committed'}
        />
        <button
          type="button"
          onClick={() => nudge(5)}
          className="btn-ghost w-9 h-9 !p-0 text-sm shrink-0"
          title="+5 minutes"
        >
          +5
        </button>
      </div>
      {timeText && !isValidTime && (
        <p className="text-center text-[11px] text-code-1">Enter a 24-hour time, e.g. 17:54</p>
      )}

      {/* Date — small, click to expand */}
      <div className="text-xs text-center">
        {showDate ? (
          <input
            type="date"
            className="input text-sm"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              commitIfLive(e.target.value, timeText)
            }}
            onBlur={() => setShowDate(false)}
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
          <button onClick={commit} disabled={!isValidTime} className="btn-primary disabled:opacity-40">
            Save time
          </button>
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
