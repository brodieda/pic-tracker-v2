import { useEffect, useMemo, useState } from 'react'
import { getPics, getEvents } from '../lib/store'
import { currentCodeFor, getAssignedKpe } from '../lib/helpers'
import { completenessFor, isIncomplete } from '../lib/completeness'

const CODE_COLOR = {
  1: 'bg-code-1',
  2: 'bg-code-2',
  3: 'bg-code-3',
  4: 'bg-code-4',
  5: 'bg-code-5',
}

// Audit — replaces the old Reports page. This table already existed there,
// just buried at the very bottom under a full page of stats duplicated from
// Dashboard. Now it's the whole point of its own tab, with room for search
// and an incomplete-only filter since it's not sharing space with charts.
export default function Audit({ refreshKey, onPicClick }) {
  const [pics, setPics] = useState([])
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [incompleteOnly, setIncompleteOnly] = useState(false)

  const reload = () => {
    setPics(getPics())
    setEvents(getEvents())
  }

  useEffect(() => {
    reload()
  }, [refreshKey])

  const allRows = useMemo(() => {
    return [...pics]
      .map((p) => ({ pic: p, mf: completenessFor(p).missingFields, incomplete: isIncomplete(p) }))
      .sort((a, b) => {
        if (a.incomplete !== b.incomplete) return a.incomplete ? -1 : 1
        return (a.pic.number || 0) - (b.pic.number || 0)
      })
  }, [pics])

  const incompleteCount = allRows.filter((r) => r.incomplete).length

  const searchNorm = search.trim().toLowerCase().replace(/^#/, '')
  const rows = allRows.filter(({ pic, incomplete }) => {
    if (incompleteOnly && !incomplete) return false
    if (!searchNorm) return true
    const num = String(pic.number ?? '')
    const name = (pic.name || '').toLowerCase()
    const desc = (pic.description || '').toLowerCase()
    return num.includes(searchNorm) || name.includes(searchNorm) || desc.includes(searchNorm)
  })

  const miss = <span className="italic text-code-3 font-semibold">missing</span>
  const inCare = <span className="text-ink-600">— in care —</span>

  const cell = (content, highlight) => (
    <td className={`px-3 py-2 align-top ${highlight ? 'bg-code-3/15' : ''}`}>{content}</td>
  )

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <header className="mb-5">
        <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-500">/ audit</p>
        <h2 className="text-3xl font-display font-bold">
          {incompleteCount === 0
            ? 'All records complete'
            : `${incompleteCount} of ${allRows.length} incomplete`}
        </h2>
        <p className="text-sm text-ink-400 mt-1">Missing fields highlighted &middot; tap a row to open the record</p>
      </header>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="panel px-3 py-2 flex items-center gap-1.5 flex-1 min-w-[180px]">
          <span className="text-ink-500 text-sm">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search # or name…"
            className="bg-transparent outline-none text-sm flex-1 text-ink-100 placeholder:text-ink-600 min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-500 hover:text-ink-200 text-xs px-1">
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setIncompleteOnly((v) => !v)}
          className={`text-[11px] font-display font-bold uppercase tracking-wide px-3 py-2 rounded-lg transition whitespace-nowrap ${
            incompleteOnly ? 'bg-code-3 text-ink-950' : 'bg-ink-800 text-ink-400 hover:text-ink-100'
          }`}
        >
          Incomplete only ({incompleteCount})
        </button>
        {(search || incompleteOnly) && (
          <span className="text-[11px] text-ink-500 font-display tabular-nums whitespace-nowrap">
            {rows.length} of {allRows.length}
          </span>
        )}
      </div>

      {allRows.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-ink-400 text-lg font-display">No PICs this event yet.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-ink-500 font-display">No records match.</p>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-ink-500 border-b border-ink-800">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Name / desc</th>
                <th className="px-3 py-2 font-semibold">KPE</th>
                <th className="px-3 py-2 font-semibold">Substances</th>
                <th className="px-3 py-2 font-semibold">Presentations</th>
                <th className="px-3 py-2 font-semibold">Outcome</th>
                <th className="px-3 py-2 font-semibold">TL sign-off</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ pic, mf }) => {
                const code = currentCodeFor(pic.id, events)
                const kpe = getAssignedKpe(pic)
                const discharged = pic.status === 'discharged'
                const subs = [
                  ...(pic.substances || []).filter((s) => s !== 'Other'),
                  ...(pic.substances?.includes('Other') && pic.substanceOther ? [pic.substanceOther] : []),
                ]
                const pres = [
                  ...(pic.presentations || []).filter((s) => s !== 'Other'),
                  ...(pic.presentations?.includes('Other') && pic.presentationOther ? [pic.presentationOther] : []),
                ]
                const subPresMissing = mf.has('substancesOrPresentations')
                return (
                  <tr
                    key={pic.id}
                    onClick={() => onPicClick?.(pic.id)}
                    className="border-b border-ink-800/60 last:border-0 cursor-pointer hover:bg-ink-800/40 whitespace-nowrap"
                  >
                    {cell(
                      <span className="tabular-nums font-display font-semibold">#{pic.number}</span>,
                    )}
                    {cell(
                      code != null ? (
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-display font-black text-white ${
                            CODE_COLOR[code] || 'bg-ink-600'
                          }`}
                        >
                          {code}
                        </span>
                      ) : (
                        '—'
                      ),
                    )}
                    {cell(mf.has('identifier') ? miss : pic.name?.trim() || pic.description?.trim() || '—', mf.has('identifier'))}
                    {cell(mf.has('assignedKpe') ? miss : kpe || '—', mf.has('assignedKpe'))}
                    {cell(subPresMissing ? miss : subs.join(', ') || '—', subPresMissing)}
                    {cell(subPresMissing ? miss : pres.join(', ') || '—', subPresMissing)}
                    {cell(discharged ? (mf.has('outcome') ? miss : pic.outcome || '—') : inCare, discharged && mf.has('outcome'))}
                    {cell(discharged ? (mf.has('tlSignoff') ? miss : pic.tlSignoff || '—') : inCare, discharged && mf.has('tlSignoff'))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
