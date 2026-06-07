import { useState } from 'react'
import { useSolverStore } from '../solver/store'
import { invertMove } from '../cube/moves'

export interface Playback {
  /** The move the 3D cube should be animating right now (null = idle). */
  animateMove: string | null
  /** A label for the move in progress / next up (for a small on-screen badge). */
  currentLabel: string | null
  /** Called by Cube3D when the in-progress turn finishes — commits the index. */
  onMoveAnimated: () => void
  next: () => void
  prev: () => void
  play: () => void
  pause: () => void
  isPlaying: boolean
  canNext: boolean
  canPrev: boolean
}

// One animated turn at a time. `pending` carries the solution it belongs to, so
// a new/cleared solution invalidates it automatically (no effect needed). The
// store's `playbackIndex` is the committed position; we only advance it once
// Cube3D reports the turn finished, then (while playing) start the next turn.
interface Pending {
  dir: 1 | -1
  move: string
  sol: string[]
}

export function useSolvePlayback(): Playback {
  const solution = useSolverStore((s) => s.solution)
  const index = useSolverStore((s) => s.playbackIndex)
  const isPlaying = useSolverStore((s) => s.isPlaying)

  const [pending, setPending] = useState<Pending | null>(null)
  const active = pending && pending.sol === solution ? pending : null

  const len = solution?.length ?? 0
  const canNext = solution !== null && index < len
  const canPrev = solution !== null && index > 0

  const next = () => {
    const { solution: sol, playbackIndex: idx } = useSolverStore.getState()
    if (active || !sol || idx >= sol.length) return
    setPending({ dir: 1, move: sol[idx], sol })
  }
  const prev = () => {
    const { solution: sol, playbackIndex: idx } = useSolverStore.getState()
    if (active || !sol || idx <= 0) return
    setPending({ dir: -1, move: invertMove(sol[idx - 1]), sol })
  }
  const play = () => {
    const { solution: sol, playbackIndex: idx, play: storePlay } = useSolverStore.getState()
    if (!sol || idx >= sol.length) return
    storePlay()
    if (!active) setPending({ dir: 1, move: sol[idx], sol })
  }
  const pause = () => useSolverStore.getState().pause()

  const onMoveAnimated = () => {
    const st = useSolverStore.getState()
    const p = pending
    if (!p || p.sol !== st.solution) {
      setPending(null)
      return
    }
    const newIndex = st.playbackIndex + p.dir
    st.setPlaybackIndex(newIndex)
    if (st.isPlaying && p.dir === 1 && newIndex < p.sol.length) {
      setPending({ dir: 1, move: p.sol[newIndex], sol: p.sol })
    } else {
      setPending(null)
      if (st.isPlaying && newIndex >= p.sol.length) st.pause()
    }
  }

  const currentLabel = active ? active.move : canNext ? solution![index] : null

  return {
    animateMove: active?.move ?? null,
    currentLabel,
    onMoveAnimated,
    next,
    prev,
    play,
    pause,
    isPlaying,
    canNext,
    canPrev,
  }
}
