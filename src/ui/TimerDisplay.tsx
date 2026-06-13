import type { TimerPhase } from '../timer/machine'

interface Props {
  phase: TimerPhase
  display: string
  inspectionSeconds: number | null
}

const phaseColor: Record<TimerPhase, string> = {
  idle: 'text-zinc-900 dark:text-zinc-100',
  inspecting: 'text-amber-500',
  holding: 'text-red-500',
  ready: 'text-green-500',
  running: 'text-zinc-900 dark:text-zinc-100',
}

export function TimerDisplay({ phase, display, inspectionSeconds }: Props) {
  // Show the inspection countdown whenever it's active — including while the
  // user presses/holds to arm the solve (holding/ready). Only once the solve is
  // running does it switch to the up-counting time.
  const value = inspectionSeconds !== null ? String(inspectionSeconds) : display
  return (
    <div className="flex items-center justify-center select-none">
      <span className={`font-mono font-bold tabular-nums text-7xl sm:text-8xl ${phaseColor[phase]}`}>
        {value}
      </span>
    </div>
  )
}
