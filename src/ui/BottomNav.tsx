import { NavLink } from 'react-router-dom'

type IconProps = { className?: string }

// Consistent 24px line icons (stroke = currentColor) so the bar matches the
// app's clean look instead of mismatched emoji.
const icon = (paths: React.ReactNode) => ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden className={className}
  >
    {paths}
  </svg>
)

const TimerIcon = icon(<><line x1="10" y1="2" x2="14" y2="2" /><line x1="12" y1="14" x2="15" y2="11" /><circle cx="12" cy="14" r="8" /></>)
const StatsIcon = icon(<><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="0.5" /><rect x="12" y="7" width="3" height="10" rx="0.5" /><rect x="17" y="13" width="3" height="4" rx="0.5" /></>)
const SolverIcon = icon(<><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>)
const AlgosIcon = icon(<><path d="M12 7v13" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></>)

const ITEMS: { to: string; Icon: (p: IconProps) => React.ReactElement; label: string }[] = [
  { to: '/timer', Icon: TimerIcon, label: 'Timer' },
  { to: '/stats', Icon: StatsIcon, label: 'Stats' },
  { to: '/solver', Icon: SolverIcon, label: 'Solver' },
  { to: '/algorithms', Icon: AlgosIcon, label: 'Algorithms' },
]

const item = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-1 py-2 ${
    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'
  }`

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="shrink-0 grid grid-cols-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ to, Icon, label }) => (
        <NavLink key={to} to={to} className={item}>
          <Icon />
          <span className="text-[11px] font-medium leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
