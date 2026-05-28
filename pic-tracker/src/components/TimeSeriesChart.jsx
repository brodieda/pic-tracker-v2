// components/TimeSeriesChart.jsx — concurrent PICs in care over event time.
//
// X-axis: time, 15-min buckets, from first admission to latest activity.
// Y-axis: number of PICs in care at that moment.
//
// At each bucket, count PICs where:
//   entered_care <= bucketTime AND (left_care > bucketTime OR left_care is null)
//
// Built with inline SVG — no chart library, keeps bundle small.

import { useMemo } from 'react'

const BUCKET_MINUTES = 15
const BUCKET_MS = BUCKET_MINUTES * 60_000

// Round a timestamp DOWN to the nearest bucket boundary
function bucketStart(ts) {
  return Math.floor(ts / BUCKET_MS) * BUCKET_MS
}

function formatBucketLabel(ms) {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function formatTooltip(ms) {
  const d = new Date(ms)
  const day = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${day} ${time}`
}

export default function TimeSeriesChart({ pics }) {
  const series = useMemo(() => {
    if (!pics || pics.length === 0) return null

    const enteredTimes = pics
      .map((p) => (p.enteredCare ? new Date(p.enteredCare).getTime() : null))
      .filter((t) => t != null)
    if (enteredTimes.length === 0) return null

    const firstAdmit = Math.min(...enteredTimes)

    // End of chart = latest of: now, latest enter, latest left
    const leftTimes = pics
      .map((p) => (p.leftCare ? new Date(p.leftCare).getTime() : null))
      .filter((t) => t != null)
    const latestActivity = Math.max(
      Date.now(),
      ...enteredTimes,
      ...(leftTimes.length ? leftTimes : [0])
    )

    const start = bucketStart(firstAdmit)
    const end = bucketStart(latestActivity) + BUCKET_MS // include the last bucket

    // Cap at a reasonable max to avoid pathological SVG widths.
    const MAX_BUCKETS = 240 // 60 hours of 15-min buckets
    let bucketSize = BUCKET_MS
    let bucketCount = Math.ceil((end - start) / bucketSize)
    if (bucketCount > MAX_BUCKETS) {
      // Increase bucket size proportionally
      bucketSize = Math.ceil((end - start) / MAX_BUCKETS / BUCKET_MS) * BUCKET_MS
      bucketCount = Math.ceil((end - start) / bucketSize)
    }

    const points = []
    let peak = 0
    let peakAt = null
    for (let i = 0; i < bucketCount; i++) {
      const t = start + i * bucketSize
      let n = 0
      for (const p of pics) {
        const enter = p.enteredCare ? new Date(p.enteredCare).getTime() : null
        if (enter == null || enter > t) continue
        const left = p.leftCare ? new Date(p.leftCare).getTime() : null
        if (left != null && left <= t) continue
        n++
      }
      points.push({ t, n })
      if (n > peak) {
        peak = n
        peakAt = t
      }
    }

    return { points, start, end, peak, peakAt, bucketSize }
  }, [pics])

  if (!series || series.points.length === 0) {
    return (
      <div className="text-sm text-ink-500 italic py-8 text-center">
        No admissions yet. Chart will appear once PICs are admitted.
      </div>
    )
  }

  // Chart dimensions
  const W = 800
  const H = 200
  const PAD_L = 32
  const PAD_R = 12
  const PAD_T = 12
  const PAD_B = 28
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B

  const { points, peak, peakAt } = series
  const yMax = Math.max(1, peak)
  const xCount = points.length

  // Build path
  const xFor = (i) => PAD_L + (xCount === 1 ? plotW / 2 : (i / (xCount - 1)) * plotW)
  const yFor = (n) => PAD_T + plotH - (n / yMax) * plotH

  let linePath = ''
  let areaPath = ''
  points.forEach((p, i) => {
    const x = xFor(i)
    const y = yFor(p.n)
    if (i === 0) {
      linePath += `M ${x} ${y}`
      areaPath += `M ${x} ${PAD_T + plotH} L ${x} ${y}`
    } else {
      linePath += ` L ${x} ${y}`
      areaPath += ` L ${x} ${y}`
    }
    if (i === points.length - 1) {
      areaPath += ` L ${x} ${PAD_T + plotH} Z`
    }
  })

  // Y axis ticks
  const yTicks = []
  const tickCount = Math.min(yMax, 5)
  for (let i = 0; i <= tickCount; i++) {
    const value = Math.round((yMax / tickCount) * i)
    yTicks.push({ value, y: yFor(value) })
  }

  // X axis ticks — show ~6 evenly-spaced labels
  const xTickCount = Math.min(xCount, 6)
  const xTicks = []
  for (let i = 0; i < xTickCount; i++) {
    const idx = xTickCount === 1 ? 0 : Math.round((i / (xTickCount - 1)) * (xCount - 1))
    xTicks.push({ idx, t: points[idx].t, x: xFor(idx) })
  }

  // Peak marker
  const peakIdx = peakAt != null ? points.findIndex((p) => p.t === peakAt) : -1
  const peakX = peakIdx >= 0 ? xFor(peakIdx) : null
  const peakY = peakIdx >= 0 ? yFor(points[peakIdx].n) : null

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs text-ink-400">
          Peak: <span className="font-display font-bold text-ink-100 tabular-nums">{peak}</span>
          {peakAt != null && (
            <span className="text-ink-500"> at {formatTooltip(peakAt)}</span>
          )}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-ink-500">
          15-min buckets
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-48 block"
          role="img"
          aria-label="PICs in care over time"
        >
          {/* Y grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={t.y}
                y2={t.y}
                stroke="currentColor"
                strokeOpacity={i === 0 ? 0.3 : 0.1}
                strokeDasharray={i === 0 ? '' : '2 3'}
                className="text-ink-600"
              />
              <text
                x={PAD_L - 6}
                y={t.y + 3}
                fontSize="10"
                textAnchor="end"
                className="fill-ink-500 font-display tabular-nums"
              >
                {t.value}
              </text>
            </g>
          ))}

          {/* Area */}
          <path
            d={areaPath}
            className="fill-shift-1"
            fillOpacity={0.18}
          />

          {/* Line */}
          <path
            d={linePath}
            className="stroke-shift-1"
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Peak marker */}
          {peakX != null && peakY != null && (
            <g>
              <line
                x1={peakX}
                x2={peakX}
                y1={peakY}
                y2={PAD_T + plotH}
                stroke="currentColor"
                strokeOpacity={0.4}
                strokeDasharray="2 3"
                className="text-code-3"
              />
              <circle
                cx={peakX}
                cy={peakY}
                r={4}
                className="fill-code-3 stroke-ink-950"
                strokeWidth={2}
              />
            </g>
          )}

          {/* X axis labels */}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={H - 8}
              fontSize="10"
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              className="fill-ink-500 font-display tabular-nums"
            >
              {formatBucketLabel(t.t)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
