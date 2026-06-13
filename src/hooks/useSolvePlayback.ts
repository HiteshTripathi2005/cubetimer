import { useEffect, useRef, useState } from 'react'
import { useSolverStore } from '../solver/store'
import { invertMove } from '../cube/moves'

// During autoplay, hold the cube still between turns so each move lands and
// registers before the next begins. The gap scales with the chosen speed, so
// the speed slider controls the whole pace (turn duration + the pause after it).
const GAP_RATIO = 0.5

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

  // Timer for the inter-move pause during autoplay; cleared on unmount.
  const gapTimer = useRef<number | null>(null)
  const clearGap = () => {
    if (gapTimer.current !== null) {
      clearTimeout(gapTimer.current)
      gapTimer.current = null
    }
  }
  useEffect(() => clearGap, [])

  const len = solution?.length ?? 0
  const canNext = solution !== null && index < len
  const canPrev = solution !== null && index > 0

  const next = () => {
    clearGap()
    const { solution: sol, playbackIndex: idx } = useSolverStore.getState()
    if (active || !sol || idx >= sol.length) return
    setPending({ dir: 1, move: sol[idx], sol })
  }
  const prev = () => {
    clearGap()
    const { solution: sol, playbackIndex: idx } = useSolverStore.getState()
    if (active || !sol || idx <= 0) return
    setPending({ dir: -1, move: invertMove(sol[idx - 1]), sol })
  }
  const play = () => {
    clearGap()
    const { solution: sol, playbackIndex: idx, play: storePlay } = useSolverStore.getState()
    if (!sol || idx >= sol.length) return
    storePlay()
    if (!active) setPending({ dir: 1, move: sol[idx], sol })
  }
  const pause = () => {
    clearGap()
    useSolverStore.getState().pause()
  }

  const onMoveAnimated = () => {
    const st = useSolverStore.getState()
    const p = pending
    if (!p || p.sol !== st.solution) {
      setPending(null)
      return
    }
    const newIndex = st.playbackIndex + p.dir
    st.setPlaybackIndex(newIndex)
    // Move done: drop to idle so the cube holds the committed state…
    setPending(null)
    if (st.isPlaying && p.dir === 1 && newIndex < p.sol.length) {
      // …then start the next turn after a pause so the user can follow along.
      clearGap()
      gapTimer.current = window.setTimeout(() => {
        gapTimer.current = null
        const cur = useSolverStore.getState()
        if (cur.isPlaying && cur.solution === p.sol && cur.playbackIndex === newIndex) {
          setPending({ dir: 1, move: p.sol[newIndex], sol: p.sol })
        }
      }, Math.round(st.speedMs * GAP_RATIO))
    } else if (st.isPlaying && newIndex >= p.sol.length) {
      st.pause()
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
