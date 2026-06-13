import { NavLink } from 'react-router-dom'
import type { Profile } from '../types'
import { Avatar } from './Avatar'

const link = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
  }`

interface Props {
  profile: Profile
  onProfile: () => void
}

export function NavBar({ profile, onProfile }: Props) {
  return (
    <nav className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
      <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0" />
      <span className="font-bold tracking-tight text-zinc-700 dark:text-zinc-200 mr-2 shrink-0">Turnix</span>
      <NavLink to="/timer" className={link}>Timer</NavLink>
      <NavLink to="/stats" className={link}>Stats</NavLink>
      <NavLink to="/solver" className={link}>Solver</NavLink>
      <NavLink to="/algorithms" className={link}>Algorithms</NavLink>
      <button type="button" aria-label="Profile" onClick={onProfile}
        className="ml-auto shrink-0 rounded-full ring-2 ring-transparent hover:ring-indigo-400">
        <Avatar profile={profile} size={32} />
      </button>
    </nav>
  )
}
