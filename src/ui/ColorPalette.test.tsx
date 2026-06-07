import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPalette } from './ColorPalette'

describe('ColorPalette', () => {
  it('renders 6 color buttons and reports selection', () => {
    const onSelect = vi.fn()
    render(<ColorPalette active="U" onSelect={onSelect} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(6)
    fireEvent.click(screen.getByLabelText('Paint color R'))
    expect(onSelect).toHaveBeenCalledWith('R')
  })
})
