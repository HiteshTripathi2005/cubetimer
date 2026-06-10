import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlgorithmsPage } from './AlgorithmsPage'

// jsdom has no WebGL; stub Cube3D so the case viewer renders without a canvas.
vi.mock('../cube/Cube3D', () => ({ Cube3D: () => null }))

describe('AlgorithmsPage', () => {
  it('shows all 57 OLL cases by default with diagrams', () => {
    render(<AlgorithmsPage />)
    expect(screen.getByText('OLL 27')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /case diagram/ }).length).toBe(57)
  })

  it('switches to PLL and shows all 21 cases', () => {
    render(<AlgorithmsPage />)
    fireEvent.click(screen.getByRole('tab', { name: /PLL/ }))
    expect(screen.getByText('T Perm')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /case diagram/ }).length).toBe(21)
  })

  it('search filters cases by name', () => {
    render(<AlgorithmsPage />)
    fireEvent.change(screen.getByLabelText('Search algorithms'), { target: { value: 'sune' } })
    expect(screen.getByText('OLL 27')).toBeInTheDocument() // Sune
    expect(screen.getByText('OLL 26')).toBeInTheDocument() // Antisune
    expect(screen.queryByText('OLL 21')).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', () => {
    render(<AlgorithmsPage />)
    fireEvent.change(screen.getByLabelText('Search algorithms'), { target: { value: 'zzzz' } })
    expect(screen.getByText(/no cases match/i)).toBeInTheDocument()
  })

  it('opens the 3D case viewer with move list and playback controls, and closes it', () => {
    render(<AlgorithmsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Play OLL 27 in 3D' }))
    const dialog = screen.getByRole('dialog', { name: /OLL 27/ })
    expect(dialog).toBeInTheDocument()
    // the alg R U R' U R U2 R' as steppable moves
    expect(screen.getByText('0 / 7')).toBeInTheDocument()
    expect(screen.getByLabelText('Play')).toBeInTheDocument()
    expect(screen.getByLabelText('Step forward')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the viewer on Escape', () => {
    render(<AlgorithmsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Play OLL 27 in 3D' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
