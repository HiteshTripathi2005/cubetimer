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
})
