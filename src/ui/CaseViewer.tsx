import { useEffect, useMemo, useState } from 'react'
import type { AlgCase } from '../algs/types'
import { caseState } from '../algs/lastLayer'
import { faceletsAfter } from '../cube/state'
import { Cube3D } from '../cube/Cube3D'
import { MoveList } from './MoveList'
import { PlaybackControls } from './PlaybackControls'
import { useMovePlayback } from '../hooks/useMovePlayback'

interface Props {
  algCase: AlgCase
  onClose: () => void
}

// Modal that plays an OLL/PLL algorithm on the 3D cube, starting from the
// case state (the cube just before the alg is applied) and ending solved.
export function CaseViewer({ algCase, onClose }: Props) {
  const moves = useMemo(() => algCase.alg.trim().split(/\s+/), [algCase.alg])
  const start = useMemo(() => caseState(algCase.alg), [algCase.alg])
  const [speedMs, setSpeedMs] = useState(600)
  const pb = useMovePlayback(moves)
  const grid = faceletsAfter(start, moves, pb.index)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${algCase.id} 3D playback`}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-xl">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">
              {algCase.id}
              {algCase.name !== algCase.id && <span className="ml-1.5 font-normal text-zinc-400">{algCase.name}</span>}
            </h2>
            <p className="text-xs text-zinc-400">{algCase.group}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </header>

        <div className="relative">
          <Cube3D grid={grid} animateMove={pb.animateMove} speedMs={speedMs} onMoveAnimated={pb.onMoveAnimated} />
          {pb.currentLabel && (
            <span className="absolute left-2 top-2 rounded-md bg-zinc-900/80 px-2 py-1 font-mono text-sm text-white">
              {pb.currentLabel}
            </span>
          )}
        </div>

        <MoveList solution={moves} playbackIndex={pb.index} />
        <div className="flex flex-wrap items-center gap-2">
          <PlaybackControls
            isPlaying={pb.isPlaying}
            speedMs={speedMs}
            onPlay={pb.play}
            onPause={pb.pause}
            onStepForward={pb.next}
            onStepBack={pb.prev}
            onSpeed={setSpeedMs}
          />
          <button
            type="button"
            onClick={pb.restart}
            disabled={!pb.canPrev}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  )
}
