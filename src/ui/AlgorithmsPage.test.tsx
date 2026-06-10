import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlgorithmsPage } from './AlgorithmsPage'

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
})
