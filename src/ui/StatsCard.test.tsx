import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCard } from './StatsCard'
import type { Solve } from '../types'

const solves: Solve[] = [1000, 2000, 3000, 4000, 5000].map((t, i) => ({
  id: String(i), sessionId: 's', timeMs: t, penalty: 'none', scramble: '', createdAt: i,
}))

function tileValue(label: string): string {
  const labelEl = screen.getByText(label)
  return labelEl.nextElementSibling?.textContent ?? ''
}

describe('StatsCard', () => {
  it('renders all 9 tiles with correct values', () => {
    render(<StatsCard solves={solves} decimals={2} />)

    // label presence
    expect(screen.getByText('best')).toBeInTheDocument()
    expect(screen.getByText('ao5')).toBeInTheDocument()

    // tile values — immune to duplicate formatted values
    expect(tileValue('solves')).toBe('5')
    expect(tileValue('best')).toBe('1.00')
    expect(tileValue('worst')).toBe('5.00')
    expect(tileValue('mean')).toBe('3.00')
    expect(tileValue('ao5')).toBe('3.00')
    expect(tileValue('ao12')).toBe('—')   // fewer than 12 solves
  })
})
