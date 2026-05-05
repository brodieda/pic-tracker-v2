import { useEffect, useRef, useState } from 'react'

/**
 * EditableCell — wraps display content; clicking switches it to edit mode.
 * The editor is rendered via render-prop so each field can choose its UI.
 *
 * Props:
 *  - label: string  (small uppercase label)
 *  - displayChildren: ReactNode (what to show in display mode)
 *  - renderEditor: ({ commit, cancel }) => ReactNode
 *  - onCommit: (value) => void   (parent handles persistence)
 *  - editing: bool  (controlled — parent can force edit mode if needed)
 *  - onEditingChange: (bool) => void
 */
export default function EditableCell({
  label,
  displayChildren,
  renderEditor,
  editingControlled,
  onEditingChange,
}) {
  const [editingLocal, setEditingLocal] = useState(false)
  const editing = editingControlled !== undefined ? editingControlled : editingLocal
  const setEditing = (v) => {
    if (editingControlled === undefined) setEditingLocal(v)
    onEditingChange?.(v)
  }

  const wrapRef = useRef(null)

  // Click outside to commit
  useEffect(() => {
    if (!editing) return
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [editing])

  return (
    <div ref={wrapRef} className="panel p-4 hover:border-ink-600 transition cursor-text">
      <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2 flex items-center justify-between">
        <span>{label}</span>
        {editing ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditing(false)
            }}
            className="text-ink-400 hover:text-ink-100 text-[10px] uppercase tracking-widest"
          >
            done
          </button>
        ) : (
          <span className="text-ink-700 group-hover:text-ink-500 text-[10px] uppercase tracking-widest opacity-0 hover:opacity-100">
            edit
          </span>
        )}
      </div>
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          {renderEditor({ done: () => setEditing(false) })}
        </div>
      ) : (
        <div onClick={() => setEditing(true)} className="cursor-pointer min-h-[1.5rem]">
          {displayChildren}
        </div>
      )}
    </div>
  )
}
