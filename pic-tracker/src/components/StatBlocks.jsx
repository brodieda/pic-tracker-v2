import { CODES } from '../constants/options'

// Big headline number — 3-4 of these go across the top of the dashboard.
export function StatBigNumber({ label, value, suffix, tone, hint }) {
  let toneClass = 'text-ink-100'
  if (tone === 'warn') toneClass = 'text-code-3'
  if (tone === 'danger') toneClass = 'text-code-1'
  if (tone === 'good') toneClass = 'text-code-5'
  if (tone === 'mh') toneClass = 'text-code-2'

  return (
    <div className="panel p-4">
      <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-500 mb-2">
        {label}
      </div>
      <div className={`font-display font-black tabular-nums leading-none ${toneClass}`}>
        <span className="text-4xl">{value ?? '—'}</span>
        {suffix && <span className="text-lg font-bold text-ink-400 ml-1">{suffix}</span>}
      </div>
      {hint && <div className="text-xs text-ink-500 mt-2">{hint}</div>}
    </div>
  )
}

// Horizontal bar list — frequency of items.
// items: [{label, count}], total optional, max optional
export function StatBarList({ items, max, emptyText = 'No data yet', highlightTone }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-ink-500 italic">{emptyText}</p>
  }
  const m = max != null ? max : Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => {
        const pct = (item.count / m) * 100
        return (
          <div key={`${item.label}-${idx}`} className="flex items-center gap-2 text-xs">
            <span className="w-32 truncate text-ink-200 shrink-0">{item.label}</span>
            <div className="flex-1 bg-ink-800 rounded h-3 relative overflow-hidden">
              <div
                className={`h-full ${highlightTone || 'bg-ink-500'} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-display tabular-nums text-ink-300 font-semibold w-7 text-right shrink-0">
              {item.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Code distribution — fixed 5 codes, colour-coded bars
export function CodeDistribution({ items }) {
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="space-y-1.5">
      {items.map(({ code, count }) => {
        const cfg = CODES.find((c) => c.code === code)
        const pct = (count / max) * 100
        return (
          <div key={code} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-ink-200 shrink-0 font-display font-semibold">
              Code {code}{cfg.desc ? ` · ${cfg.desc}` : ''}
            </span>
            <div className="flex-1 bg-ink-800 rounded h-3 relative overflow-hidden">
              <div className={`h-full ${cfg.tw} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-display tabular-nums text-ink-300 font-semibold w-7 text-right shrink-0">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Section panel wrapper
export function StatSection({ title, children, action }) {
  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-display font-bold uppercase tracking-[0.18em] text-ink-300">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}
