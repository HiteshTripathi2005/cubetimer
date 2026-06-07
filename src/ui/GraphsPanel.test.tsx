import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraphsPanel } from './GraphsPanel'
import type { Solve } from '../types'

describe('GraphsPanel', () => {
  it('shows an empty hint with too few solves', () => {
    render(<GraphsPanel solves={[]} />)
    expect(screen.getByText(/not enough solves/i)).toBeInTheDocument()
  })
  it('renders a polyline when there are solves', () => {
    const solves: Solve[] = [1000, 2000, 1500].map((t, i) => ({
      id: String(i), sessionId: 's', timeMs: t, penalty: 'none', scramble: '', createdAt: i,
    }))
    const { container } = render(<GraphsPanel solves={solves} />)
    expect(container.querySelector('polyline')).not.toBeNull()
  })
  it('renders two polylines (time + ao5 trend) with at least 5 solves', () => {
    const solves: Solve[] = [1000, 2000, 1500, 3000, 2500, 1800].map((t, i) => ({
      id: String(i), sessionId: 's', timeMs: t, penalty: 'none', scramble: '', createdAt: i,
    }))
    const { container } = render(<GraphsPanel solves={solves} />)
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
  })
})
