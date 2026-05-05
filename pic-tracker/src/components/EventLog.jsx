import { formatDateTime } from '../lib/helpers'

const TYPE_LABELS = {
  admit: 'Admitted',
  code_change: 'Code change',
  kpe_change: 'KPE change',
  note: 'Note',
  check: 'Welfare check',
  discharge: 'Discharged',
}

const TYPE_TONE = {
  admit: 'border-shift-1 text-shift-1',
  code_change: 'border-code-3 text-code-3',
  kpe_change: 'border-shift-2 text-shift-2',
  note: 'border-ink-600 text-ink-300',
  check: 'border-code-5 text-code-5',
  discharge: 'border-ink-500 text-ink-200',
}

export function EventLogItem({ event }) {
  return (
    <li
      className={`pl-3 border-l-2 py-1.5 ${TYPE_TONE[event.type] || 'border-ink-700 text-ink-300'}`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xs font-display font-bold uppercase tracking-wider">
          {TYPE_LABELS[event.type] || event.type}
        </span>
        {event.code != null && (
          <span className="text-xs font-display font-bold tabular-nums text-ink-200">
            Code {event.code}
          </span>
        )}
        {event.kpe && <span className="text-xs text-ink-400">· {event.kpe}</span>}
        <span className="text-xs font-display tabular-nums text-ink-500 ml-auto">
          {formatDateTime(event.timestamp)}
        </span>
      </div>
      {event.note && (
        <div className="text-sm text-ink-200 mt-1 leading-snug">{event.note}</div>
      )}
    </li>
  )
}

export default function EventLog({ events, picId }) {
  const items = events
    .filter((e) => e.picId === picId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  if (items.length === 0) {
    return <p className="text-sm text-ink-500 italic">No events logged yet.</p>
  }

  return (
    <ol className="space-y-2">
      {items.map((e) => (
        <EventLogItem key={e.id} event={e} />
      ))}
    </ol>
  )
}
