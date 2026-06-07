import { describe, it, expect } from 'vitest'
import { validateGrid } from './validate'
import { solvedFacelets } from '../cube/state'

describe('validateGrid', () => {
  it('accepts a complete solved grid and returns facelets', () => {
    const r = validateGrid(solvedFacelets())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.facelets.length).toBe(54)
  })

  it('rejects an incomplete grid (nulls)', () => {
    const grid = solvedFacelets() as (string | null)[]
    grid[0] = null
    const r = validateGrid(grid as never)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/painted/i)
  })

  it('rejects a wrong color count', () => {
    const grid = [...solvedFacelets()]
    grid[0] = 'R' // now 10 R, 8 U
    const r = validateGrid(grid)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/9/)
  })

  it('rejects duplicate/altered centers', () => {
    const grid = [...solvedFacelets()]
    grid[13] = 'U' // R center -> U (now two U centers)
    const r = validateGrid(grid)
    expect(r.ok).toBe(false)
  })
})
