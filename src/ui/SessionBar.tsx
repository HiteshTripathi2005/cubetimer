import type { Session } from '../types'

interface Props {
  sessions: Session[]
  activeId: string
  onSwitch: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function SessionBar({ sessions, activeId, onSwitch, onCreate, onRename, onDelete }: Props) {
  const active = sessions.find((s) => s.id === activeId)
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="sr-only" htmlFor="session-select">Active session</label>
      <select id="session-select" aria-label="Active session" value={activeId}
        onChange={(e) => onSwitch(e.target.value)}
        className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1">
        {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" aria-label="New session" className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => { const name = prompt('Session name?'); if (name) onCreate(name) }}>＋</button>
      <button type="button" aria-label="Rename session" className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => { if (active) { const name = prompt('Rename session', active.name); if (name) onRename(active.id, name) } }}>✎</button>
      <button type="button" aria-label="Delete session" className="px-2 py-1 rounded text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => { if (active && confirm(`Delete session "${active.name}" and its solves?`)) onDelete(active.id) }}>🗑</button>
    </div>
  )
}
