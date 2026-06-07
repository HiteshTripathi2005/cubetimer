import { describe, it, expect } from 'vitest'
import { clampIndex, selectDisplayGrid } from './playback'
import { solvedFacelets, applyMoves } from '../cube/state'

describe('playback helpers', () => {
  it('clampIndex bounds to [0, total]', () => {
    expect(clampIndex(-1, 5)).toBe(0)
    expect(clampIndex(3, 5)).toBe(3)
    expect(clampIndex(9, 5)).toBe(5)
  })

  it('selectDisplayGrid returns the editable grid when no solution', () => {
    const grid = solvedFacelets()
    expect(selectDisplayGrid({ grid, inputFacelets: null, solution: null, playbackIndex: 0 })).toBe(grid)
  })

  it('selectDisplayGrid returns input + first n solution moves when solving', () => {
    const input = applyMoves(solvedFacelets(), "R U R' U'")
    const solution = ['U', 'R', "U'", "R'"]
    const out = selectDisplayGrid({ grid: input, inputFacelets: input, solution, playbackIndex: 2 })
    expect(out.join('')).toBe(applyMoves(input, 'U R').join(''))
  })
})
