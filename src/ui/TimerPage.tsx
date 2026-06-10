import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useTimer } from '../timer/useTimer'
import { downloadExport, buildExport } from '../transfer/transfer'
import type { ExportOptions } from '../transfer/transfer'
import { ScrambleBar } from './ScrambleBar'
import { TimerDisplay } from './TimerDisplay'
import { StatsCard } from './StatsCard'
import { SolveList } from './SolveList'
import { ScramblePreview } from './ScramblePreview'
import { GraphsPanel } from './GraphsPanel'
import { SessionBar } from './SessionBar'
import { SettingsPanel } from './SettingsPanel'
import { ImportExportDialog } from './ImportExportDialog'
import { getAllSessions, getAllSolves } from '../storage/db'

export function TimerPage() {
  const s = useStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  // Adaptation #1: use a stable action reference so the effect dep array is satisfied
  // without a blanket eslint-disable. Zustand action identities are stable, and the
  // store's initStarted guard ensures init() runs only once.
  const init = useStore((st) => st.init)
  useEffect(() => { void init() }, [init])

  const { phase, display, inspectionSeconds, pointerHandlers } = useTimer({
    config: { inspection: s.settings.inspection, holdToStartMs: s.settings.holdToStartMs },
    onSolve: (ms, penalty) => { void s.addSolve(ms, penalty) },
    decimals: s.settings.decimalPlaces,
    audioCues: s.settings.inspectionAudioCues,
  })

  if (!s.ready) {
    return <div className="h-full grid place-items-center text-zinc-400">Loading…</div>
  }

  const handleExport = async (opts: ExportOptions) => {
    const sessions = await getAllSessions()
    const solves = await getAllSolves()
    const file = buildExport(opts, s.settings, sessions, solves, Date.now())
    const date = new Date().toISOString().slice(0, 10)
    downloadExport(file, `cubetimer-export-${date}.json`)
  }

  return (
    <div className="h-full w-full px-4 py-4 sm:px-6 lg:px-8 flex flex-col gap-4 md:overflow-hidden">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SessionBar
            sessions={s.sessions} activeId={s.settings.activeSessionId}
            onSwitch={(id) => void s.switchSession(id)}
            onCreate={(name) => void s.createSession(name)}
            onRename={(id, name) => void s.renameSession(id, name)}
            onDelete={(id) => void s.deleteSession(id)}
          />
          <button type="button" aria-label="Settings" onClick={() => setShowSettings((v) => !v)}
            className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">⚙</button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid gap-6 md:grid-cols-[1.6fr_1fr] xl:grid-cols-[2.2fr_1fr]">
        {/* Left: scramble + timer */}
        <section className="flex flex-col min-h-0">
          <ScrambleBar scramble={s.scramble} onNewScramble={() => s.newScramble()} />
          <div
            className="flex-1 grid place-items-center touch-none"
            style={{ touchAction: 'none' }}
            {...pointerHandlers}
          >
            <TimerDisplay phase={phase} display={display} inspectionSeconds={inspectionSeconds} />
          </div>
        </section>

        {/* Right: stats / list / preview / graphs (hidden in distraction-free) */}
        {!s.settings.distractionFree && (
          <aside className="flex flex-col gap-4 min-h-0">
            <StatsCard solves={s.solves} decimals={s.settings.decimalPlaces} />
            <div className="flex-1 min-h-0 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <SolveList
                solves={s.solves} decimals={s.settings.decimalPlaces}
                onSetPenalty={(id, p) => void s.setPenalty(id, p)}
                onDelete={(id) => void s.deleteSolve(id)}
              />
            </div>
            <div className="shrink-0 rounded-xl border border-zinc-100 dark:border-zinc-800 p-2">
              <ScramblePreview scramble={s.scramble} />
            </div>
            <div className="shrink-0 rounded-xl border border-zinc-100 dark:border-zinc-800 p-2">
              <GraphsPanel solves={s.solves} />
            </div>
          </aside>
        )}
      </div>

      {showSettings && (
        <div className="fixed right-4 top-24 z-40 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-lg">
          <SettingsPanel
            settings={s.settings}
            onChange={(patch) => s.updateSettings(patch)}
            onOpenTransfer={() => { setShowSettings(false); setShowTransfer(true) }}
          />
        </div>
      )}

      {showTransfer && (
        <ImportExportDialog
          onExport={(opts) => void handleExport(opts)}
          onImport={(file, mode) => void s.importData(file, mode)}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  )
}
