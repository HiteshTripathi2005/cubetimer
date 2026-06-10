import { useEffect } from 'react'
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { useSolverStore } from '../solver/store'
import { warmSolver } from '../solver/client'
import { Cube3D } from '../cube/Cube3D'
import { NetEditor } from './NetEditor'
import { ColorPalette } from './ColorPalette'
import { MoveList } from './MoveList'
import { PlaybackControls } from './PlaybackControls'
import { selectDisplayGrid } from '../cube/playback'
import { colorCounts, offCountColors } from '../solver/validate'
import { useSolvePlayback } from '../hooks/useSolvePlayback'

const TALLY_FACES: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']

export function SolverPage() {
  const s = useSolverStore()
  const playback = useSolvePlayback()
  // Build the solver tables in the worker right away so the first Solve is fast.
  useEffect(() => { warmSolver() }, [])
  const display = selectDisplayGrid({
    grid: s.grid, inputFacelets: s.inputFacelets, solution: s.solution, playbackIndex: s.playbackIndex,
  })
  const painting = s.solution === null
  const showCounts = s.status === 'error'
  const counts = showCounts ? colorCounts(s.grid) : null
  const offColors = showCounts ? offCountColors(s.grid) : undefined

  const actionBtn = 'rounded-md px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'

  return (
    <div className="min-h-full w-full px-4 py-4 sm:px-6 lg:px-8 grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:grid-cols-[minmax(0,1fr)_minmax(380px,480px)]">
      {/* Left: input */}
      <section className="flex flex-col gap-4 min-h-0">
        <div className="relative">
          <Cube3D
            grid={display}
            onPaint={painting ? s.paintSticker : undefined}
            animateMove={playback.animateMove}
            speedMs={s.speedMs}
            onMoveAnimated={playback.onMoveAnimated}
          />
          {!painting && playback.currentLabel && (
            <span className="absolute left-2 top-2 rounded-md bg-zinc-900/80 px-2 py-1 font-mono text-sm text-white">
              {playback.currentLabel}
            </span>
          )}
        </div>
        {painting && (
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-center md:gap-10">
            <NetEditor grid={s.grid} onPaint={s.paintSticker} highlight={offColors} />
            <div className="flex flex-col items-center gap-3 md:items-start">
              <ColorPalette active={s.activeColor} onSelect={s.setActiveColor} />
              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                <button type="button" onClick={s.resetToSolved} className={actionBtn}>Reset</button>
                <button type="button" onClick={s.clear} className={actionBtn}>Clear</button>
                <button type="button" onClick={s.scramble} className={actionBtn}>Scramble</button>
              </div>
            </div>
          </div>
        )}
        {!painting && (
          <button type="button" onClick={s.clearSolution} className={`self-center lg:self-start ${actionBtn}`}>Edit cube</button>
        )}
      </section>

      {/* Right: solution */}
      <aside className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col gap-3 self-start w-full lg:sticky lg:top-4">
        <button
          type="button"
          onClick={() => void s.solveCurrent()}
          disabled={s.status === 'solving'}
          className="w-full sm:w-auto sm:self-start rounded-md bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {s.status === 'solving' ? 'Solving…' : 'Solve'}
        </button>
        {s.status === 'error' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-500">{s.error}</p>
            {counts && (
              <div className="flex flex-wrap gap-1.5" aria-label="color tally">
                {TALLY_FACES.map((f) => {
                  const off = counts[f] !== 9
                  return (
                    <span
                      key={f}
                      data-off={off ? 'true' : 'false'}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                        off
                          ? 'bg-red-100 text-red-700 font-semibold dark:bg-red-900/40 dark:text-red-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      <span className="h-3 w-3 rounded-sm border border-zinc-400" style={{ backgroundColor: FACE_COLORS[f] }} />
                      {counts[f]}
                    </span>
                  )
                })}
              </div>
            )}
            {offColors && offColors.length > 0 && (
              <p className="text-xs text-zinc-400">Flagged stickers are ringed on the net below.</p>
            )}
          </div>
        )}
        {s.solution && <>
          <MoveList solution={s.solution} playbackIndex={s.playbackIndex} />
          <PlaybackControls
            isPlaying={playback.isPlaying} speedMs={s.speedMs}
            onPlay={playback.play} onPause={playback.pause}
            onStepForward={playback.next} onStepBack={playback.prev} onSpeed={s.setSpeed}
          />
        </>}
        {!s.solution && s.status !== 'error' && <p className="text-zinc-400 text-sm">Paint your cube, then press Solve.</p>}
      </aside>
    </div>
  )
}

export default SolverPage
