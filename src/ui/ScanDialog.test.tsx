import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScanDialog } from './ScanDialog'

describe('ScanDialog', () => {
  it('shows a friendly error when no camera is available (jsdom)', async () => {
    render(<ScanDialog onApply={() => {}} onClose={() => {}} />)
    expect(await screen.findByText(/camera is not available/i)).toBeInTheDocument()
  })

  it('starts on the green-face step and can be closed', () => {
    const onClose = vi.fn()
    render(<ScanDialog onApply={() => {}} onClose={onClose} />)
    expect(screen.getByText(/scan the green face/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<ScanDialog onApply={() => {}} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
