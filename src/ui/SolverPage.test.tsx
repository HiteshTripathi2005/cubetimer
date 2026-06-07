import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SolverPage } from './SolverPage'
import { useSolverStore } from '../solver/store'
import { applyMoves } from '../cube/state'

// jsdom has no WebGL; stub Cube3D so the page renders without a real canvas.
vi.mock('../cube/Cube3D', () => ({ Cube3D: () => null }))

beforeEach(() => useSolverStore.getState().resetToSolved())

describe('SolverPage (input)', () => {
  it('renders palette, net, and helper buttons', () => {
    render(<SolverPage />)
    expect(screen.getByLabelText('Paint color R')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^sticker /).length).toBe(54)
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /scramble/i })).toBeInTheDocument()
  })

  it('painting via the net updates the store', () => {
    useSolverStore.getState().clear()
    useSolverStore.getState().setActiveColor('R')
    render(<SolverPage />)
    fireEvent.click(screen.getByLabelText('sticker 0'))
    expect(useSolverStore.getState().grid[0]).toBe('R')
  })
})

describe('SolverPage (solve)', () => {
  it('solving shows the move list and playback controls', async () => {
    useSolverStore.getState().resetToSolved()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, "R U R' U'") })
    render(<SolverPage />)
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }))
    await waitFor(() => expect(screen.getByLabelText('Play')).toBeInTheDocument())
    expect(screen.getByLabelText('Step forward')).toBeInTheDocument()
  })

  it('shows a validation error for an incomplete cube', async () => {
    useSolverStore.getState().clear()
    render(<SolverPage />)
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }))
    await waitFor(() => expect(screen.getByText(/painted/i)).toBeInTheDocument())
  })
})
