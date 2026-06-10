import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScanDialog } from './ScanDialog'

describe('ScanDialog', () => {
  afterEach(() => vi.unstubAllGlobals())

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

  it('shows orientation guide strips with the expected neighbor colors', async () => {
    const track = { stop: vi.fn() }
    const fakeStream = { getTracks: () => [track] } as unknown as MediaStream
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
    })
    // jsdom doesn't implement HTMLMediaElement.play
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)

    render(<ScanDialog onApply={() => {}} onClose={() => {}} />)
    // Green face step: white above, yellow below, orange left, red right.
    expect(await screen.findByTestId('strip-top')).toHaveStyle({ backgroundColor: '#ffffff' })
    expect(screen.getByTestId('strip-bottom')).toHaveStyle({ backgroundColor: '#ffd500' })
    expect(screen.getByTestId('strip-left')).toHaveStyle({ backgroundColor: '#ff8c00' })
    expect(screen.getByTestId('strip-right')).toHaveStyle({ backgroundColor: '#ec0000' })
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<ScanDialog onApply={() => {}} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
