import { useState } from 'react'
import type { Session } from '../types'
import { Modal } from './Modal'
import { Dropdown } from './Dropdown'

interface Props {
  sessions: Session[]
  activeId: string
  onSwitch: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

type Dialog =
  | { kind: 'create' }
  | { kind: 'rename' }
  | { kind: 'delete' }
  | null

const iconBtn = 'px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800'

export function SessionBar({ sessions, activeId, onSwitch, onCreate, onRename, onDelete }: Props) {
  const active = sessions.find((s) => s.id === activeId)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [name, setName] = useState('')

  const openCreate = () => { setName(''); setDialog({ kind: 'create' }) }
  const openRename = () => { if (active) { setName(active.name); setDialog({ kind: 'rename' }) } }
  const openDelete = () => { if (active && sessions.length > 1) setDialog({ kind: 'delete' }) }
  const close = () => setDialog(null)

  const submitName = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (dialog?.kind === 'create') onCreate(trimmed)
    else if (dialog?.kind === 'rename' && active) onRename(active.id, trimmed)
    close()
  }

  const input =
    'mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500'
  const primary = 'rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50'
  const secondary = 'rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm'

  return (
    <div className="flex items-center gap-2 text-sm">
      <Dropdown
        ariaLabel="Active session"
        value={activeId}
        options={sessions.map((s) => ({ value: s.id, label: s.name }))}
        onChange={onSwitch}
      />
      <button type="button" aria-label="New session" className={iconBtn} onClick={openCreate}>＋</button>
      <button type="button" aria-label="Rename session" className={iconBtn} onClick={openRename}>✎</button>
      <button type="button" aria-label="Delete session" className={`${iconBtn} text-red-400`}
        disabled={sessions.length <= 1} onClick={openDelete}>🗑</button>

      {(dialog?.kind === 'create' || dialog?.kind === 'rename') && (
        <Modal title={dialog.kind === 'create' ? 'New session' : 'Rename session'} onClose={close}>
          <form onSubmit={submitName}>
            <label className="text-xs text-zinc-500">Session name
              <input autoFocus aria-label="Session name" className={input}
                value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. One-handed" />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={secondary} onClick={close}>Cancel</button>
              <button type="submit" className={primary} disabled={!name.trim()}>
                {dialog.kind === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === 'delete' && active && (
        <Modal title="Delete session" onClose={close}>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Delete “{active.name}” and all of its solves? This can’t be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={secondary} onClick={close}>Cancel</button>
            <button type="button" className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              onClick={() => { onDelete(active.id); close() }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
