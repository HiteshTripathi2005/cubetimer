import type { Solve } from '../types'
import { average, best, bestAverage, formatTime, mean, worst } from '../stats/averages'

interface Props {
  solves: Solve[]
  decimals: 2 | 3
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="font-mono tabular-nums text-zinc-800 dark:text-zinc-100">{value}</div>
    </div>
  )
}

export function StatsCard({ solves, decimals }: Props) {
  const f = (v: number | 'DNF' | null) => formatTime(v, decimals)
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="solves"   value={String(solves.length)} />
      <Stat label="best"     value={f(best(solves))} />
      <Stat label="worst"    value={f(worst(solves))} />
      <Stat label="mean"     value={f(mean(solves))} />
      <Stat label="ao5"      value={f(average(solves, 5))} />
      <Stat label="ao12"     value={f(average(solves, 12))} />
      <Stat label="best ao5" value={f(bestAverage(solves, 5))} />
      <Stat label="best ao12" value={f(bestAverage(solves, 12))} />
      <Stat label="ao100"    value={f(average(solves, 100))} />
    </div>
  )
}
