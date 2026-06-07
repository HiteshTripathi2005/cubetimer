import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MoveList } from './MoveList'

describe('MoveList', () => {
  it('shows the moves and a counter, highlighting the current move', () => {
    render(<MoveList solution={['R', 'U', "R'", "U'"]} playbackIndex={2} />)
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
    expect(screen.getByTestId('move-2').getAttribute('data-current')).toBe('true')
    expect(screen.getByTestId('move-0').getAttribute('data-current')).toBe('false')
  })
})
