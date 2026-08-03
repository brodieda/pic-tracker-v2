import { useEffect, useMemo, useState } from 'react'
import {
  getEvent,
  getPics,
  addPic,
  addEvent,
  peekNextPicNumber,
  claimNextPicNumber,
  picIdFromNumber,
  nextEventId,
} from '../lib/store'
import { nowIso, formatClock, unassignedKpes, addFriend } from '../lib/helpers'
import { mirrorAdmit } from '../lib/dualWrite'
import {
  REFERRED_BY,
  REFERRED_BY_COLORS,
  SUBSTANCES,
  SUBSTANCE_COLORS,
  PRESENTATIONS,
  PRESENTATION_COLORS,
  GENDERS,
  AGE_RANGES,
  CODES,
} from '../constants/options'
import ChipGroup from './ChipGroup'
import KpeDropdownPicker from './KpeDropdownPicker'
import ShieldIcon from './ShieldIcon'
import Code1Warning from './Code1Warning'

const initialForm = {
  name: '',
  code: null,
  enteredCare: nowIso(),
  referredBy: [],
  referredByOther: '',
  substances: [],
  substanceOther: '',
  presentations: [],
  presentationOther: '',
  intakeKpe: '',
  gender: null,
  ageRange: null,
  description: '',
  intakeNote: '',
  ejectionFlag: false,
  friends: [],
}

// Inline row layout: label left, content right. Wraps cleanly on narrow screens.
function FieldRow({ label, hint, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] sm:gap-5 gap-2 items-start">
      <div className="pt-1">
        <div className="text-xs font-display font-semibold uppercase tracking-[0.14em] text-ink-300">
          {label}
        </div>
        {hint && <div className="text-[11px] text-ink-500 mt-1">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function IntakeModal({ open, onClose, onCreated, initialValues }) {
  const [form, setForm] = useState(initialForm)
  const [showOptional, setShowOptional] = useState(false)
  const [error, setError] = useState(null)
  const [eventCfg, setEventCfg] = useState({ shift1Team: [], shift2Team: [] })
  const [picNumber, setPicNumber] = useState(null)
  const [code1Pending, setCode1Pending] = useState(false) // showing the Code 1 warning
  const [overCapacityAck, setOverCapacityAck] = useState(false)
  const [addingFriend, setAddingFriend] = useState(false)
  const [friendDraft, setFriendDraft] = useState('')

  useEffect(() => {
    if (open) {
      setForm({ ...initialForm, ...(initialValues || {}), enteredCare: nowIso() })
      setShowOptional(!!initialValues)
      setError(null)
      setEventCfg(getEvent())
      setPicNumber(peekNextPicNumber())
      setCode1Pending(false)
      setOverCapacityAck(false)
      setAddingFriend(false)
      setFriendDraft('')
    }
  }, [open])

  const unassigned = useMemo(
    () => (open ? unassignedKpes(getPics(), eventCfg) : []),
    [open, eventCfg],
  )

  // Capacity check
  const inCareCount = useMemo(
    () => (open ? getPics().filter((p) => p.status === 'in_care').length : 0),
    [open],
  )
  const capacity = eventCfg.capacity
  const atCapacity = capacity != null && inCareCount >= capacity

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const onAddFriendDraft = () => {
    const name = friendDraft.trim()
    if (!name) return
    update({ friends: [...form.friends, name] })
    setFriendDraft('')
  }
  const onRemoveFriendDraft = (name) => {
    update({ friends: form.friends.filter((n) => n !== name) })
  }

  const onSelectCode = (code) => {
    if (code === 1 && form.code !== 1) {
      // Show emergency warning before committing the selection
      setCode1Pending(true)
      return
    }
    update({ code })
  }

  const handleSubmit = () => {
    setError(null)

    if (form.code == null) return setError('Severity code is required.')

    if (atCapacity && !overCapacityAck) {
      setError(
        `At capacity (${inCareCount}/${capacity}). Tap Admit again to override and admit anyway.`,
      )
      setOverCapacityAck(true)
      return
    }

    // Claim a stable PIC number atomically (writes to localStorage seq)
    const num = claimNextPicNumber()
    const picId = picIdFromNumber(num)
    const ts = form.enteredCare || nowIso()

    // Name fallback: if no name typed, use the description as a fallback descriptor.
    // If neither, leave as null — the PIC # is the identifier.
    const trimmedName = form.name.trim()
    const trimmedDesc = form.description.trim()
    const nameValue = trimmedName || trimmedDesc || null

    const pic = {
      id: picId,
      number: num,
      name: nameValue,
      gender: form.gender,
      ageRange: form.ageRange,
      description: trimmedDesc || null,
      enteredCare: ts,
      leftCare: null,
      referredBy: form.referredBy,
      referredByOther: form.referredBy.includes('Other') ? form.referredByOther.trim() || null : null,
      substances: form.substances,
      substanceOther: form.substances.includes('Other') ? form.substanceOther.trim() || null : null,
      presentations: form.presentations,
      presentationOther: form.presentations.includes('Other')
        ? form.presentationOther.trim() || null
        : null,
      intakeKpe: form.intakeKpe.trim() || null,  // legacy field, kept for back-compat
      assignedKpe: form.intakeKpe.trim() || null,
      outcome: null,
      outcomeOther: null,
      referredTo: null,
      referredToOther: null,
      medicalInvolved: null,
      lastKpe: null,
      tlSignoff: null,
      ejectionFlag: !!form.ejectionFlag,
      securityNotified: null,
      source: 'writer',
      status: 'in_care',
    }

    addPic(pic)

    const admitEvent = {
      id: nextEventId(),
      picId,
      timestamp: ts,
      type: 'admit',
      code: form.code,
      kpe: form.intakeKpe.trim() || null,
      note: form.intakeNote.trim() || null,
      meta: {},
    }
    addEvent(admitEvent)

    // Mirror to Supabase (fire and forget — no-op if not configured / not a writer)
    mirrorAdmit(pic, admitEvent)

    // Any friends staged during intake get logged against the new PIC now that it exists.
    form.friends.forEach((name) => addFriend(picId, name, form.intakeKpe.trim() || null))

    onCreated?.(pic)
    onClose?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[92vh] bg-ink-950 sm:rounded-2xl border border-ink-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header — PIC # is the headline */}
        <div className="px-6 py-5 border-b border-ink-800 flex items-center gap-4">
          <div className="flex-1 flex items-baseline gap-3">
            <span className="font-display font-black text-3xl tabular-nums tracking-tight">
              #{picNumber}
            </span>
            <div>
              <p className="text-[10px] font-display tracking-[0.3em] uppercase text-ink-500">
                / new pic
              </p>
              <h2 className="text-base font-display font-bold text-ink-200">Admit to care</h2>
            </div>
          </div>
          {capacity != null && (
            <div
              className={`text-xs font-display tabular-nums px-2.5 py-1 rounded-md border ${
                atCapacity
                  ? 'border-code-1 text-code-1'
                  : inCareCount >= capacity - 3
                  ? 'border-code-3 text-code-3'
                  : 'border-ink-700 text-ink-400'
              }`}
            >
              {inCareCount} / {capacity} spaces
            </div>
          )}
          <button onClick={onClose} className="btn-ghost" aria-label="Close">
            Cancel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Name + time-in row */}
          <FieldRow label="PIC name">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input"
                placeholder="PIC Name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                autoFocus
              />
              <div className="flex items-center gap-2 sm:w-44">
                <div className="input flex-1 font-display tabular-nums text-center">
                  {formatClock(form.enteredCare)}
                </div>
                <button
                  type="button"
                  className="btn-ghost px-3"
                  onClick={() => update({ enteredCare: nowIso() })}
                  title="Reset to now"
                >
                  Now
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <input
                className="input flex-1 min-w-0"
                placeholder="Description"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
              />
              <div className="flex gap-2">
                <select
                  className="input flex-1 sm:flex-none sm:w-auto"
                  value={form.ageRange || ''}
                  onChange={(e) => update({ ageRange: e.target.value || null })}
                >
                  <option value="">Age</option>
                  {AGE_RANGES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <select
                  className="input flex-1 sm:flex-none sm:w-auto"
                  value={form.gender || ''}
                  onChange={(e) => update({ gender: e.target.value || null })}
                >
                  <option value="">Gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {!addingFriend && (
                <button
                  type="button"
                  onClick={() => setAddingFriend(true)}
                  className="btn-ghost text-sm"
                >
                  + Friends
                </button>
              )}
              {addingFriend && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Friend's name"
                    autoFocus
                    value={friendDraft}
                    onChange={(e) => setFriendDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onAddFriendDraft()
                      if (e.key === 'Escape') {
                        setAddingFriend(false)
                        setFriendDraft('')
                      }
                    }}
                  />
                  <button type="button" onClick={onAddFriendDraft} className="btn-ghost text-sm shrink-0">
                    Add
                  </button>
                </div>
              )}
            </div>
            {form.friends.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.friends.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 bg-ink-900 border border-ink-700 rounded-full pl-3 pr-1.5 py-1 text-sm font-semibold text-ink-200"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => onRemoveFriendDraft(name)}
                      className="text-ink-500 hover:text-code-1 w-4 h-4 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FieldRow>

          <div className="divider" />

          {/* Severity code — Code 1 visually deprioritised */}
          <FieldRow label="Severity code *">
            <div className="space-y-2">
              <div className="flex items-stretch gap-3">
                {/* Left column: Code 1, Code 2, Security — small stacked pills */}
                <div className="flex flex-col gap-2 w-32 sm:w-36 shrink-0">
                  {[CODES[0], CODES[1]].map((c) => {
                    const active = form.code === c.code
                    const toneOff =
                      c.code === 1
                        ? 'bg-code-1/10 border-code-1/40 text-code-1 hover:border-code-1/70'
                        : 'bg-code-2/10 border-code-2/40 text-code-2 hover:border-code-2/70'
                    const toneOn =
                      c.code === 1
                        ? 'bg-code-1 border-code-1 text-white'
                        : 'bg-code-2 border-code-2 text-white'
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => onSelectCode(c.code)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 w-full h-9 px-2.5 rounded-lg border text-xs font-display font-semibold transition ${
                          active ? toneOn : toneOff
                        }`}
                        title={`Code ${c.code} — ${c.desc}`}
                      >
                        <span className="font-black text-sm leading-none shrink-0">{c.code}</span>
                        <span className="truncate">{c.desc}</span>
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => update({ ejectionFlag: !form.ejectionFlag })}
                    aria-pressed={form.ejectionFlag}
                    className={`inline-flex items-center gap-1.5 w-full h-9 px-2.5 rounded-lg border text-xs font-display font-semibold transition ${
                      form.ejectionFlag
                        ? 'secflag-on'
                        : 'bg-ink-900 border-ink-700 text-ink-400 hover:border-ink-500'
                    }`}
                    title="RSA/Security ejection or possible security intervention"
                  >
                    <ShieldIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Security</span>
                  </button>
                </div>

                {/* Right: Codes 3, 4, 5 — big primary buttons */}
                <div className="flex-1 flex gap-2">
                  {CODES.slice(2).map((c) => {
                    const active = form.code === c.code
                    const tone = c.code === 3 ? 'text-ink-950' : 'text-white'
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => onSelectCode(c.code)}
                        className={`relative flex-1 rounded-xl font-display font-bold ${c.tw} ${tone} transition border-2 ${
                          active
                            ? 'border-white scale-[1.02] shadow-lg'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight py-3">
                          <span className="text-2xl">{c.code}</span>
                          {c.desc && (
                            <span className="text-[10px] uppercase tracking-wide sm:tracking-widest font-semibold opacity-80 mt-0.5 text-center leading-tight">
                              {c.desc}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              {form.code === 1 && (
                <div className="text-xs text-code-1 font-semibold flex items-center gap-2 pl-1">
                  ⚠ Medical emergency — escalate immediately
                </div>
              )}
            </div>
          </FieldRow>

          <div className="divider" />

          <FieldRow label="Assigned KPE" hint="Optional - can assign later">
            <KpeDropdownPicker
              value={form.intakeKpe}
              shift1Team={eventCfg.shift1Team || []}
              shift2Team={eventCfg.shift2Team || []}
              unassigned={unassigned}
              onSelect={(v) => update({ intakeKpe: v || '' })}
              emptyHint="No KPEs configured yet — add rosters in Settings."
            />
          </FieldRow>

          <div className="divider" />

          <FieldRow label="Referred by" hint="Multi-select">
            <ChipGroup
              options={REFERRED_BY}
              value={form.referredBy}
              onChange={(v) => update({ referredBy: v })}
              multi
              colorMap={REFERRED_BY_COLORS}
              otherValue={form.referredByOther}
              onOtherChange={(v) => update({ referredByOther: v })}
            />
          </FieldRow>

          <FieldRow label="Substances" hint="Multi-select">
            <ChipGroup
              options={SUBSTANCES}
              value={form.substances}
              onChange={(v) => update({ substances: v })}
              multi
              colorMap={SUBSTANCE_COLORS}
              otherValue={form.substanceOther}
              onOtherChange={(v) => update({ substanceOther: v })}
            />
          </FieldRow>

          <FieldRow label="Presentations" hint="Multi-select">
            <ChipGroup
              options={PRESENTATIONS}
              value={form.presentations}
              onChange={(v) => update({ presentations: v })}
              multi
              colorMap={PRESENTATION_COLORS}
              otherValue={form.presentationOther}
              onOtherChange={(v) => update({ presentationOther: v })}
            />
          </FieldRow>

          {/* Optional disclosure */}
          <div className="border-t border-ink-800 pt-5">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-ink-300 hover:text-ink-100"
            >
              <span className={`inline-block transition ${showOptional ? 'rotate-90' : ''}`}>›</span>
              Intake note
            </button>

            {showOptional && (
              <div className="mt-5 space-y-5">
                <FieldRow label="Intake note">
                  <textarea
                    className="input min-h-[5rem]"
                    placeholder="Initial observations, friends present, etc."
                    value={form.intakeNote}
                    onChange={(e) => update({ intakeNote: e.target.value })}
                  />
                </FieldRow>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-6 py-4 flex items-center gap-3">
          {error ? (
            <span className="text-sm text-code-1 font-semibold flex-1">{error}</span>
          ) : atCapacity ? (
            <span className="text-sm text-code-3 font-semibold flex-1">
              At capacity ({inCareCount}/{capacity}) — admit will require override
            </span>
          ) : (
            <span className="text-xs text-ink-500 flex-1">
              * required: code

            </span>
          )}
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={atCapacity ? 'btn-danger' : 'btn-primary'}
            onClick={handleSubmit}
          >
            {atCapacity && overCapacityAck ? `Admit #${picNumber} anyway` : `Admit PIC #${picNumber}`}
          </button>
        </div>
      </div>

      <Code1Warning
        open={code1Pending}
        onCancel={() => setCode1Pending(false)}
        onContinue={() => {
          update({ code: 1 })
          setCode1Pending(false)
        }}
      />
    </div>
  )
}
