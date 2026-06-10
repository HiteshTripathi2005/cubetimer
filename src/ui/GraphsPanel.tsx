import type { Solve } from '../types'
import { average, effectiveTime } from '../stats/averages'

interface Props { solves: Solve[] }

export function GraphsPanel({ solves }: Props) {
  const points = solves
    .map((s) => effectiveTime(s))
    .filter((t): t is number => t !== null)

  if (points.length < 2) {
    return <p className="text-sm text-zinc-400 p-3">Not enough solves to graph yet.</p>
  }

  const w = 300
  const h = 120
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const coords = points.map((t, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((t - min) / span) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const trendCoords: string[] = []
  for (let i = 0; i < solves.length; i++) {
    const ao5 = average(solves.slice(0, i + 1).slice(-5), 5)
    if (typeof ao5 !== 'number') continue
    const x = (i / (solves.length - 1)) * w
    const y = h - ((ao5 - min) / span) * h
    trendCoords.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-h-28" role="img" aria-label="Solve times">
      <polyline points={coords.join(' ')} fill="none" stroke="#6366f1" strokeWidth={2} />
      {trendCoords.length > 0 && (
        <polyline points={trendCoords.join(' ')} fill="none" stroke="#f59e0b" strokeWidth={2} />
      )}
    </svg>
  )
}
