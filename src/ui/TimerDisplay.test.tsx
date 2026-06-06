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
})
