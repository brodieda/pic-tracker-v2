// components/ActorNameBadge.jsx — small header pill showing "Signed in as: X"
// for writers and viewers. Click to set/change. Stored per device in
// localStorage. Stamped into activity_log.actor_name on every write.
//
// Not shown for intake-only role (they enter their name on the intake form).

import { useEffect, useState } from 'react'
import { getActorName, setActorName } from '../lib/actorName'
import { isWriter, isViewer } from '../lib/eventSession'

export default function ActorNameBadge() {
  const [name, setName] = useState(getActorName())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  // Show only for writer / viewer
  const show = isWriter() || isViewer()

  // Prompt on first load if no name set (writers and viewers benefit from
  // immediate attribution; we don't force it, but we surface it).
  useEffect(() => {
    if (!show) return
    if (!name) {
      // Open the editor on mount if no name is set, after a short delay
      // so the rest of the UI settles first.
      const t = setTimeout(() => {
        setEditing(true)
        setDraft('')
      }, 300)
      return () => clearTimeout(t)
    }
  }, [show, name])

  if (!show) return null

  const save = () => {
    const clean = draft.trim()
    setActorName(clean)
    setName(clean)
    setEditing(false)
  }

  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  if (editing) {
    return (
      <div className="fixed inset-0 z-50 bg-ink-900/80 flex items-center justify-center px-4">
        <div className="panel w-full max-w-sm p-5 space-y-4">
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-1">
              Who are you?
            </div>
            <div className="text-sm text-ink-300">
              Your name is recorded on every action you take on this device
              (admit, discharge, code change, note). This helps trace who did
              what in the activity log.
            </div>
          </div>
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') cancel()
            }}
            placeholder="e.g. Brodie"
            maxLength={60}
            className="w-full bg-ink-900 border border-ink-700 focus:border-ink-500 rounded-md px-3 py-2 text-ink-100 font-display"
          />
          <div className="flex gap-2 justify-end">
            {name && (
              <button
                onClick={cancel}
                className="text-xs text-ink-400 hover:text-ink-200 px-3 py-2"
              >
                Cancel
              </button>
            )}
            <button
              onClick={save}
              disabled={!draft.trim()}
              className="bg-ink-100 text-ink-900 text-xs font-display font-bold uppercase tracking-widest px-4 py-2 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(name || '')
        setEditing(true)
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ink-800 border border-ink-700 hover:border-ink-500 transition"
      title="Change your name on this device"
    >
      <span className="text-[10px] font-display font-bold uppercase tracking-widest text-ink-400">
        You
      </span>
      <span className="font-display font-semibold text-sm text-ink-100 max-w-[8rem] truncate">
        {name || 'Set name'}
      </span>
    </button>
  )
}
