import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ScramblePreview } from './ScramblePreview'

describe('ScramblePreview', () => {
  it('renders 54 sticker rects', () => {
    const { container } = render(<ScramblePreview scramble="R U R' U'" />)
    expect(container.querySelectorAll('rect').length).toBe(54)
  })
})
