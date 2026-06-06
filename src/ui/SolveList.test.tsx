import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SolveList } from './SolveList'
import type { Solve } from '../types'

const solves: Solve[] = [
  { id: 'a', sessionId: 's', timeMs: 12000, penalty: 'none', scramble: 'R', createdAt: 1 },
  { id: 'b', sessionId: 's', timeMs: 13000, penalty: 'plus2', scramble: 'U', createdAt: 2 },
]

describe('SolveList', () => {
  it('lists solves newest-first with penalty markers', () => {
    render(<SolveList solves={solves} decimals={2} onSetPenalty={vi.fn()} onDelete={vi.fn()} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('15.00+') // 13.00 + 2 = 15.00, plus2 marker
    expect(rows[1]).toHaveTextContent('12.00')
  })

  it('fires delete', () => {
    const onDelete = vi.fn()
    render(<SolveList solves={solves} decimals={2} onSetPenalty={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getAllByLabelText('Delete solve')[0])
    expect(onDelete).toHaveBeenCalledWith('b')
  })
})
