import type { Penalty, Solve } from '../types'
import { effectiveTime, formatTime } from '../stats/averages'

interface Props {
  solves: Solve[]
  decimals: 2 | 3
  onSetPenalty: (id: string, penalty: Penalty) => void
  onDelete: (id: string) => void
}

function label(solve: Solve, decimals: 2 | 3): string {
  if (solve.penalty === 'dnf') return 'DNF'
  const t = effectiveTime(solve)
  const base = formatTime(t, decimals)
  return solve.penalty === 'plus2' ? `${base}+` : base
}

export function SolveList({ solves, decimals, onSetPenalty, onDelete }: Props) {
  const ordered = [...solves].reverse() // newest first
  return (
    <ul className="max-h-full h-full divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto">
      {ordered.map((solve, i) => (
        <li key={solve.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
          <span className="w-6 text-right text-zinc-400">{ordered.length - i}</span>
          <span className="flex-1 font-mono tabular-nums">{label(solve, decimals)}</span>
          <button type="button" className="px-1 text-xs text-zinc-500 hover:text-zinc-900"
            onClick={() => onSetPenalty(solve.id, solve.penalty === 'plus2' ? 'none' : 'plus2')}
            aria-label="Toggle +2">+2</button>
          <button type="button" className="px-1 text-xs text-zinc-500 hover:text-zinc-900"
            onClick={() => onSetPenalty(solve.id, solve.penalty === 'dnf' ? 'none' : 'dnf')}
            aria-label="Toggle DNF">DNF</button>
          <button type="button" className="px-1 text-xs text-red-400 hover:text-red-600"
            onClick={() => onDelete(solve.id)} aria-label="Delete solve">✕</button>
        </li>
      ))}
    </ul>
  )
}
