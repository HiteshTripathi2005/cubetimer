import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NetEditor } from './NetEditor'
import { solvedFacelets } from '../cube/state'

describe('NetEditor', () => {
  it('renders 54 sticker cells and reports clicks by facelet index', () => {
    const onPaint = vi.fn()
    render(<NetEditor grid={solvedFacelets()} onPaint={onPaint} />)
    expect(screen.getAllByRole('button').length).toBe(54)
    fireEvent.click(screen.getByLabelText('sticker 0'))
    expect(onPaint).toHaveBeenCalledWith(0)
  })
})
