// components/IntakeOnlyScreen.jsx
//
// The entire UI for users joined with the admit/intake code.
// No nav, no board access, no PIC visibility. Just:
//   - Single intake form
//   - On submit: brief "PIC #N admitted" view with optional Add Note button
//   - Note window expires after 5 minutes, then back to a fresh form
//
// Mobile-first design: large tap targets, single column, minimal scrolling.

import { useEffect, useState } from 'react'
import { CODES, REFERRED_BY, SUBSTANCES, PRESENTATIONS, GENDERS, AGE_RANGES } from '../constants/options'
import { supabase } from '../lib/supabaseClient'
import { getSession, clearSession } from '../lib/eventSession'

// We talk directly to Supabase here — no localStorage mirror. Intake-only
// has no read access, so there's nothing to mirror back to.

const ALLOWED_NOTE_WINDOW_MS = 5 * 60 * 1000

export default function IntakeOnlyScreen() {
  const session = getSession()
  const [phase, setPhase] = useState('form') // 'form' | 'submitting' | 'submitted'
  const [error, setError] = useState(null)
  const [submittedPic, setSubmittedPic] = useState(null) // { number, id, eventName, timestamp }
  const [noteText, setNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteAdded, setNoteAdded] = useState(false)
  const [noteWindowExpired, setNoteWindowExpired] = useState(false)

  // Form state
  const [code, setCode] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gender, setGender] = useState(null)
  const [ageRange, setAgeRange] = useState(null)
  const [referredBy, setReferredBy] = useState([])
  const [substances, setSubstances] = useState([])
  const [presentations, setPresentations] = useState([])
  const [intakeNote, setIntakeNote] = useState('')

  const resetForm = () => {
    setCode(null)
    setName('')
    setDescription('')
    setGender(null)
    setAgeRange(null)
    setReferredBy([])
    setSubstances([])
    setPresentations([])
    setIntakeNote('')
    setPhase('form')
    setError(null)
    setSubmittedPic(null)
    setNoteText('')
    setNoteAdded(false)
    setNoteWindowExpired(false)
  }

  // After submit, start a 5-minute countdown to close the note window.
  useEffect(() => {
    if (phase !== 'submitted' || noteWindowExpired) return
    const submittedAt = submittedPic?.timestamp ? new Date(submittedPic.timestamp).getTime() : Date.now()
    const elapsed = Date.now() - submittedAt
    const remaining = Math.max(0, ALLOWED_NOTE_WINDOW_MS - elapsed)
    if (remaining <= 0) {
      setNoteWindowExpired(true)
      return
    }
    const t = setTimeout(() => setNoteWindowExpired(true), remaining)
    return () => clearTimeout(t)
  }, [phase, submittedPic, noteWindowExpired])

  const submitPic = async () => {
    if (code == null) {
      setError('Please select a code.')
      return
    }
    setError(null)
    setPhase('submitting')
    const nowIso = new Date().toISOString()
    try {
      // Use the RPC path — bypasses RLS via SECURITY DEFINER, with code-based
      // re-verification as a fallback if the JWT isn't being honoured.
      const { data, error: rpcErr } = await supabase.rpc('intake_only_admit_pic', {
        p_code: code,
        p_session_code: session.admitCode || null,
        p_name: name.trim() || null,
        p_description: description.trim() || null,
        p_gender: gender,
        p_age_range: ageRange,
        p_referred_by: referredBy,
        p_substances: substances,
        p_presentations: presentations,
        p_intake_note: intakeNote.trim() || null,
      })
      if (rpcErr) throw rpcErr
      const result = Array.isArray(data) ? data[0] : data
      if (!result || !result.pic_id) throw new Error('No PIC returned')

      setSubmittedPic({
        number: result.pic_number,
        id: result.pic_id,
        eventName: session.eventName,
        timestamp: nowIso,
      })
      setPhase('submitted')
    } catch (e) {
      console.error('intake submit failed', e)
      setError(e.message || 'Submission failed. Try again.')
      setPhase('form')
    }
  }

  const submitNote = async () => {
    if (!noteText.trim() || !submittedPic) return
    setNoteBusy(true)
    try {
      const { error: rpcErr } = await supabase.rpc('intake_only_add_note', {
        p_pic_id: submittedPic.id,
        p_note: noteText.trim(),
        p_session_code: session.admitCode || null,
      })
      if (rpcErr) throw rpcErr
      setNoteAdded(true)
      setNoteText('')
    } catch (e) {
      console.error('intake note failed', e)
      alert('Could not add note. Try again.')
    } finally {
      setNoteBusy(false)
    }
  }

  const onLeave = async () => {
    if (!confirm('Leave intake mode on this device?')) return
    await clearSession()
    window.location.reload()
  }

  if (phase === 'submitted' && submittedPic) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-md mx-auto space-y-5">
          <header className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-display tracking-[0.3em] uppercase text-ink-500">
                {session.eventName || 'Event'} &middot; Intake
              </div>
            </div>
            <button onClick={onLeave} className="text-xs text-ink-500 hover:text-ink-300">
              Leave
            </button>
          </header>

          <div className="panel p-6 space-y-3 text-center">
            <div className="text-xs font-display tracking-[0.22em] uppercase text-ink-500">
              Admitted
            </div>
            <div className="font-display font-bold text-5xl tabular-nums text-code-5">
              #{submittedPic.number}
            </div>
            <p className="text-sm text-ink-300">
              The carespace has been notified. Expected arrival.
            </p>
          </div>

          {!noteWindowExpired && !noteAdded && (
            <div className="panel p-5 space-y-3">
              <div>
                <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
                  Add a note (optional)
                </div>
                <p className="text-xs text-ink-400 mb-2">
                  En-route updates for this PIC. Window closes in 5 minutes.
                </p>
                <textarea
                  className="input min-h-[5rem]"
                  placeholder="e.g. Slowing down. May need stretcher."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  disabled={noteBusy}
                />
              </div>
              <button
                onClick={submitNote}
                className="btn-primary w-full"
                disabled={noteBusy || !noteText.trim()}
              >
                {noteBusy ? 'Sending...' : 'Add note'}
              </button>
            </div>
          )}

          {noteAdded && (
            <div className="panel p-4 text-center text-sm text-code-5 font-display font-semibold">
              Note added. You can add more while the window stays open.
            </div>
          )}

          {noteWindowExpired && (
            <div className="panel p-4 text-center text-xs text-ink-500">
              Note window closed.
            </div>
          )}

          <button
            onClick={resetForm}
            className="btn-primary w-full py-4 text-base"
          >
            + Admit another PIC
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-md mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-lg tracking-tight">PIC</span>
              <span className="font-display font-bold text-lg tracking-tight text-ink-400">intake</span>
            </div>
            <div className="text-[10px] font-display tracking-[0.3em] uppercase text-ink-500 mt-0.5">
              {session.eventName || 'Event'}
            </div>
          </div>
          <button onClick={onLeave} className="text-xs text-ink-500 hover:text-ink-300">
            Leave
          </button>
        </header>

        {/* CODE — required */}
        <div className="panel p-4 space-y-2">
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500">
            Code <span className="text-code-1">*</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {CODES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCode(c.code === code ? null : c.code)}
                className={`h-16 rounded-xl font-display font-bold text-2xl border-2 transition tabular-nums ${
                  code === c.code
                    ? `bg-code-${c.code} text-white border-white shadow-lg`
                    : `bg-code-${c.code}/15 border-code-${c.code}/50 text-code-${c.code} hover:border-code-${c.code}`
                }`}
              >
                {c.code}
              </button>
            ))}
          </div>
        </div>

        {/* Name + description */}
        <div className="panel p-4 space-y-3">
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
              Name <span className="text-ink-600 normal-case font-normal">(optional)</span>
            </div>
            <input
              className="input"
              placeholder="e.g. Leah"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
              Description <span className="text-ink-600 normal-case font-normal">(optional)</span>
            </div>
            <input
              className="input"
              placeholder="e.g. red shirt, male, with friend in white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Gender + Age */}
        <div className="panel p-4 space-y-3">
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
              Gender
            </div>
            <ChipRow options={GENDERS} value={gender} onChange={setGender} />
          </div>
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
              Age range
            </div>
            <ChipRow options={AGE_RANGES} value={ageRange} onChange={setAgeRange} />
          </div>
        </div>

        {/* Referred by */}
        <div className="panel p-4">
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
            Referred by
          </div>
          <ChipRow options={REFERRED_BY} value={referredBy} onChange={setReferredBy} multi tone="tint" />
        </div>

        {/* Substances */}
        <div className="panel p-4">
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
            Substances
          </div>
          <ChipRow options={SUBSTANCES} value={substances} onChange={setSubstances} multi />
        </div>

        {/* Presentations */}
        <div className="panel p-4">
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
            Presentations
          </div>
          <ChipRow options={PRESENTATIONS} value={presentations} onChange={setPresentations} multi />
        </div>

        {/* Note */}
        <div className="panel p-4">
          <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
            Note <span className="text-ink-600 normal-case font-normal">(optional)</span>
          </div>
          <textarea
            className="input min-h-[4rem]"
            placeholder="Anything the carespace should know..."
            value={intakeNote}
            onChange={(e) => setIntakeNote(e.target.value)}
          />
        </div>

        {error && <div className="text-sm text-code-1 font-semibold text-center">{error}</div>}

        <button
          onClick={submitPic}
          className="btn-primary w-full py-4 text-base"
          disabled={phase === 'submitting'}
        >
          {phase === 'submitting' ? 'Submitting...' : 'Admit PIC'}
        </button>

        <div className="h-8" />
      </div>
    </div>
  )
}

// Simple chip row component (mobile-friendly, large tap targets).
// Supports both single-select (value is a string/number) and multi-select (value is an array).
function ChipRow({ options, value, onChange, multi = false, tone = 'neutral' }) {
  const isSelected = (optValue) => {
    if (multi) return Array.isArray(value) && value.includes(optValue)
    return value === optValue
  }
  const toggle = (optValue) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : []
      onChange(arr.includes(optValue) ? arr.filter((v) => v !== optValue) : [...arr, optValue])
    } else {
      onChange(value === optValue ? null : optValue)
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const label = typeof opt === 'string' ? opt : (opt.label || opt.value)
        const val = typeof opt === 'string' ? opt : (opt.value ?? opt.label)
        if (val === 'Other') return null // skip "Other" for now in intake-only — keeps it fast
        const onClass = tone === 'tint' ? 'bg-blue-500 text-white border-blue-500' : 'bg-ink-100 text-ink-950 border-white'
        const offClass = tone === 'tint' ? 'bg-blue-500/10 text-blue-300 border-blue-500/25 hover:border-blue-400/50' : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
        return (
          <button
            key={val}
            onClick={() => toggle(val)}
            className={`px-3 py-2 rounded-lg text-sm font-display font-semibold border transition ${
              isSelected(val) ? onClass : offClass
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}