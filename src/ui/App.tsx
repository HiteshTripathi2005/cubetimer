import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { NavBar } from './NavBar'
import { TimerPage } from './TimerPage'

const SolverPage = lazy(() => import('./SolverPage'))

export function App() {
  const theme = useStore((s) => s.settings.theme)

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
      <NavBar />
      <div className="flex-1 min-h-0">
        <Routes>
          <Route path="/timer" element={<TimerPage />} />
          <Route
            path="/solver"
            element={
              <Suspense fallback={<div className="h-full grid place-items-center text-zinc-400">Loading solver…</div>}>
                <SolverPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/timer" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
