import type { Solve } from '../types'
import { effectiveTime } from '../stats/averages'

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
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Solve times">
      <polyline points={coords.join(' ')} fill="none" stroke="#6366f1" strokeWidth={2} />
    </svg>
  )
}
