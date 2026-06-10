import { NavLink } from 'react-router-dom'

const link = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
  }`

export function NavBar() {
  return (
    <nav className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
      <span className="font-semibold text-zinc-700 dark:text-zinc-200 mr-2 shrink-0">CubeTimer</span>
      <NavLink to="/timer" className={link}>Timer</NavLink>
      <NavLink to="/solver" className={link}>Solver</NavLink>
      <NavLink to="/algorithms" className={link}>Algorithms</NavLink>
    </nav>
  )
}
