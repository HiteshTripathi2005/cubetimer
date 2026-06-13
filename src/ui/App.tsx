import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { NavBar } from './NavBar'
import { BottomNav } from './BottomNav'
import { TimerPage } from './TimerPage'
import { StatsPage } from './StatsPage'
import { Avatar } from './Avatar'
import { ProfileModal } from './ProfileModal'
import type { Profile } from '../types'

const SolverPage = lazy(() => import('./SolverPage'))
const AlgorithmsPage = lazy(() => import('./AlgorithmsPage'))

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.svg" alt="" className="h-7 w-7" />
      <span className="font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Turnix</span>
    </div>
  )
}

function ProfileButton({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  return (
    <button type="button" aria-label="Profile" onClick={onClick}
      className="rounded-full ring-2 ring-transparent hover:ring-indigo-400">
      <Avatar profile={profile} size={32} />
    </button>
  )
}

// Phone/tablet header: logo + name on the left, profile on the right. Navigation
// itself lives in the bottom bar.
function MobileTopBar({ profile, onProfile }: { profile: Profile; onProfile: () => void }) {
  return (
    <header
      className="shrink-0 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5"
      // Pad below the device status bar so the header sits inside the app,
      // not behind the status bar on edge-to-edge phones.
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
    >
      <Brand />
      <ProfileButton profile={profile} onClick={onProfile} />
    </header>
  )
}

const fallback = (label: string) => (
  <div className="h-full grid place-items-center text-zinc-400">{label}</div>
)

export function App() {
  const theme = useStore((s) => s.settings.theme)
  const profile = useStore((s) => s.settings.profile)
  const updateSettings = useStore((s) => s.updateSettings)
  const solving = useStore((s) => s.solving)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [showProfile, setShowProfile] = useState(false)

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

  const openProfile = () => setShowProfile(true)

  return (
    <div className="h-full flex flex-col">
      {/* Chrome hides during a solve so nothing competes with the timer. */}
      {!solving && (
        isDesktop
          ? <NavBar profile={profile} onProfile={openProfile} />
          : <MobileTopBar profile={profile} onProfile={openProfile} />
      )}
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

      {showProfile && (
        <ProfileModal
          profile={profile}
          onSave={(p) => updateSettings({ profile: p })}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}

export default App
