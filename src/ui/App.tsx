import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { NavBar } from './NavBar'
import { BottomNav } from './BottomNav'
import { TimerPage } from './TimerPage'
import { StatsPage } from './StatsPage'

const SolverPage = lazy(() => import('./SolverPage'))
const AlgorithmsPage = lazy(() => import('./AlgorithmsPage'))

// Phone/tablet get a slim wordmark header (navigation lives in the bottom bar);
// desktop keeps the full top nav.
function MobileTopBar() {
  return (
    <header
      className="shrink-0 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5"
      // Pad below the device status bar so the wordmark sits inside the app,
      // not behind the status bar on edge-to-edge phones.
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
    >
      <span className="font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Turnix</span>
    </header>
  )
}

const fallback = (label: string) => (
  <div className="h-full grid place-items-center text-zinc-400">{label}</div>
)

export function App() {
  const theme = useStore((s) => s.settings.theme)
  const solving = useStore((s) => s.solving)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // Apply theme to <html> (light/dark/system) — shell-level so it covers all routes.
  useEffect(() => {
    const root = document.documentElement
    const apply = (dark: boolean) => root.classList.toggle('dark', dark)
    if (theme === 'dark') { apply(true); return }
    if (theme === 'light') { apply(false); return }
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) { apply(false); return }
    apply(mq.matches)
    const onChange = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return (
    <div className="h-full flex flex-col">
      {/* Chrome hides during a solve so nothing competes with the timer. */}
      {!solving && (isDesktop ? <NavBar /> : <MobileTopBar />)}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Routes>
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route
            path="/solver"
            element={<Suspense fallback={fallback('Loading solver…')}><SolverPage /></Suspense>}
          />
          <Route
            path="/algorithms"
            element={<Suspense fallback={fallback('Loading algorithms…')}><AlgorithmsPage /></Suspense>}
          />
          <Route path="*" element={<Navigate to="/timer" replace />} />
        </Routes>
      </div>
      {!isDesktop && !solving && <BottomNav />}
    </div>
  )
}

export default App
