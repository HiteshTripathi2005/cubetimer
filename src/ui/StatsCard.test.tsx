import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCard } from './StatsCard'
import type { Solve } from '../types'

const solves: Solve[] = [1000, 2000, 3000, 4000, 5000].map((t, i) => ({
  id: String(i), sessionId: 's', timeMs: t, penalty: 'none', scramble: '', createdAt: i,
}))

describe('StatsCard', () => {
  it('renders best and ao5 labels with values', () => {
    render(<StatsCard solves={solves} decimals={2} />)
    expect(screen.getByText('best')).toBeInTheDocument()
    expect(screen.getByText('ao5')).toBeInTheDocument()
    expect(screen.getByText('1.00')).toBeInTheDocument() // best
    expect(screen.getByText('3.00')).toBeInTheDocument() // current ao5
  })
})
