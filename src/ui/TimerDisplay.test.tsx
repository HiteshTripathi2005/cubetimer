import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimerDisplay } from './TimerDisplay'

describe('TimerDisplay', () => {
  it('shows the display value', () => {
    render(<TimerDisplay phase="idle" display="12.48" inspectionSeconds={null} />)
    expect(screen.getByText('12.48')).toBeInTheDocument()
  })
  it('shows inspection seconds when inspecting', () => {
    render(<TimerDisplay phase="inspecting" display="0.00" inspectionSeconds={8} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })
  it('keeps showing the countdown while holding/ready during inspection', () => {
    // Pressing during inspection arms the solve (holding -> ready). The
    // countdown must stay visible, not flip to "0.00".
    const { rerender } = render(<TimerDisplay phase="holding" display="0.00" inspectionSeconds={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    rerender(<TimerDisplay phase="ready" display="0.00" inspectionSeconds={6} />)
    expect(screen.getByText('6')).toBeInTheDocument()
  })
  it('shows the running time once the solve starts (no inspection seconds)', () => {
    render(<TimerDisplay phase="running" display="1.23" inspectionSeconds={null} />)
    expect(screen.getByText('1.23')).toBeInTheDocument()
  })
})
