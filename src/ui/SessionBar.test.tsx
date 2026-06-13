import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionBar } from './SessionBar'
import type { Session } from '../types'

const sessions: Session[] = [
  { id: 's1', name: 'Main', createdAt: 1 },
  { id: 's2', name: 'OH', createdAt: 2 },
]

describe('SessionBar', () => {
  it('switches session on select change', () => {
    const onSwitch = vi.fn()
    render(<SessionBar sessions={sessions} activeId="s1" onSwitch={onSwitch}
      onCreate={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Active session'), { target: { value: 's2' } })
    expect(onSwitch).toHaveBeenCalledWith('s2')
  })

  it('creates a session through the in-app dialog (no prompt)', () => {
    const onCreate = vi.fn()
    render(<SessionBar sessions={sessions} activeId="s1" onSwitch={vi.fn()}
      onCreate={onCreate} onRename={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'New session' }))
    fireEvent.change(screen.getByLabelText('Session name'), { target: { value: 'Feet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreate).toHaveBeenCalledWith('Feet')
  })

  it('confirms deletion through the in-app dialog (no confirm)', () => {
    const onDelete = vi.fn()
    render(<SessionBar sessions={sessions} activeId="s2" onSwitch={vi.fn()}
      onCreate={vi.fn()} onRename={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith('s2')
  })
})
