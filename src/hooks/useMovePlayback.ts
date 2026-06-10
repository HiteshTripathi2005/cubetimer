import { useState } from 'react'
import { invertMove } from '../cube/moves'

// Local-state cousin of useSolvePlayback for playing an arbitrary fixed move
// sequence (e.g. an OLL/PLL alg). One animated turn at a time; `index` is the
// committed position and only advances when Cube3D reports the turn finished.
// Callers should remount the hook (React `key`) when the sequence changes.

export interface MovePlayback {
  index: number
  isPlaying: boolean
  animateMove: string | null
  currentLabel: string | null
  onMoveAnimated: () => void
  next: () => void
  prev: () => void
  play: () => void
  pause: () => void
  restart: () => void
  canNext: boolean
  canPrev: boolean
}

interface Pending {
  dir: 1 | -1
  move: string
}

export function useMovePlayback(moves: string[]): MovePlayback {
  const [index, setIndex] = useState(0)
  const [isPlaying, setPlaying] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  const canNext = index < moves.length
  const canPrev = index > 0

  const next = () => {
    if (pending || !canNext) return
    setPlaying(false)
    setPending({ dir: 1, move: moves[index] })
  }
  const prev = () => {
    if (pending || !canPrev) return
    setPlaying(false)
    setPending({ dir: -1, move: invertMove(moves[index - 1]) })
  }
  const play = () => {
    if (!canNext) return
    setPlaying(true)
    if (!pending) setPending({ dir: 1, move: moves[index] })
  }
  const pause = () => setPlaying(false)
  const restart = () => {
    setIndex(0)
    setPlaying(false)
    setPending(null)
  }

  const onMoveAnimated = () => {
    if (!pending) return
    const newIndex = index + pending.dir
    setIndex(newIndex)
    if (isPlaying && pending.dir === 1 && newIndex < moves.length) {
      setPending({ dir: 1, move: moves[newIndex] })
    } else {
      setPending(null)
      if (isPlaying && newIndex >= moves.length) setPlaying(false)
    }
  }

  const currentLabel = pending ? pending.move : canNext ? moves[index] : null

  return {
    index,
    isPlaying,
    animateMove: pending?.move ?? null,
    currentLabel,
    onMoveAnimated,
    next,
    prev,
    play,
    pause,
    restart,
    canNext,
    canPrev,
  }
}
