import { useStore } from '../store/useStore'
import { StatsCard } from './StatsCard'
import { SolveList } from './SolveList'
import { ScramblePreview } from './ScramblePreview'
import { GraphsPanel } from './GraphsPanel'
import { eventOf } from '../scramble/events'

// Averages, solve history, scramble preview, and the trend graph. Shared by the
// desktop timer's right column and the phone/tablet Stats tab so both stay in
// sync. Reads from the store directly; the solve list scrolls within its box.
export function StatsView() {
  const solves = useStore((s) => s.solves)
  const decimals = useStore((s) => s.settings.decimalPlaces)
  const scramble = useStore((s) => s.scramble)
  const setPenalty = useStore((s) => s.setPenalty)
  const deleteSolve = useStore((s) => s.deleteSolve)
  // The 2D net preview only models a 3×3; hide it for other puzzles.
  const is3x3 = useStore((s) => eventOf(s.sessions.find((x) => x.id === s.settings.activeSessionId))) === '333'

  return (
    <div className="flex h-full flex-col gap-4 min-h-0">
      <StatsCard solves={solves} decimals={decimals} />
      <div className="flex-1 min-h-0 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <SolveList
          solves={solves} decimals={decimals}
          onSetPenalty={(id, p) => void setPenalty(id, p)}
          onDelete={(id) => void deleteSolve(id)}
        />
      </div>
      {is3x3 && (
        <div className="shrink-0 rounded-xl border border-zinc-100 dark:border-zinc-800 p-2">
          <ScramblePreview scramble={scramble} />
        </div>
      )}
      <div className="shrink-0 rounded-xl border border-zinc-100 dark:border-zinc-800 p-2">
        <GraphsPanel solves={solves} />
      </div>
    </div>
  )
}
