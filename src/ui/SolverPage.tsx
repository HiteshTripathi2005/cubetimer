import { useSolverStore } from '../solver/store'
import { Cube3D } from '../cube/Cube3D'
import { NetEditor } from './NetEditor'
import { ColorPalette } from './ColorPalette'

export function SolverPage() {
  const grid = useSolverStore((s) => s.grid)
  const activeColor = useSolverStore((s) => s.activeColor)
  const { paintSticker, setActiveColor, resetToSolved, clear, scramble } = useSolverStore.getState()

  return (
    <div className="h-full mx-auto max-w-6xl px-4 py-4 grid gap-6 md:grid-cols-[1.3fr_1fr]">
      {/* Left: input */}
      <section className="flex flex-col gap-4 min-h-0">
        <Cube3D grid={grid} onPaint={paintSticker} />
        <ColorPalette active={activeColor} onSelect={setActiveColor} />
        <NetEditor grid={grid} onPaint={paintSticker} />
        <div className="flex gap-2">
          <button type="button" onClick={resetToSolved} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Reset</button>
          <button type="button" onClick={clear} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Clear</button>
          <button type="button" onClick={scramble} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Scramble</button>
        </div>
      </section>

      {/* Right: solution (Phase 2 fills this in) */}
      <aside className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 text-zinc-400">
        Paint your cube, then solving lands here.
      </aside>
    </div>
  )
}

export default SolverPage
