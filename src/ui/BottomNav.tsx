import { NavLink } from 'react-router-dom'

// Phone/tablet primary navigation. Icons are decorative (aria-hidden) so each
// link's accessible name is just its label.
const ITEMS: { to: string; icon: string; label: string }[] = [
  { to: '/timer', icon: '⏱', label: 'Timer' },
  { to: '/stats', icon: '📊', label: 'Stats' },
  { to: '/solver', icon: '🧩', label: 'Solver' },
  { to: '/algorithms', icon: '📖', label: 'Algorithms' },
]

const item = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-0.5 py-2 ${
    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'
  }`

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="shrink-0 grid grid-cols-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ to, icon, label }) => (
        <NavLink key={to} to={to} className={item}>
          <span aria-hidden className="text-xl leading-none">{icon}</span>
          <span className="text-[11px] font-medium leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
