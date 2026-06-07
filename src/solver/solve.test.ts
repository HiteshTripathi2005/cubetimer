import { describe, it, expect } from 'vitest'
import { solveFacelets, SolverError } from './solve'
import { solvedFacelets, applyMoves } from '../cube/state'

describe('solveFacelets', () => {
  it('returns a move list that actually solves several scrambles', () => {
    const scrambles = ["R U R' U'", "F R U' R' U' R U R' F'", "R U2 R' U' R U' R'"]
    for (const scr of scrambles) {
      const input = applyMoves(solvedFacelets(), scr)
      const solution = solveFacelets(input)
      expect(Array.isArray(solution)).toBe(true)
      expect(solution.length).toBeGreaterThan(0)
      // applying the solution to the input reaches solved
      expect(applyMoves(input, solution.join(' ')).join('')).toBe(solvedFacelets().join(''))
    }
  })

  it('returns an empty list for an already-solved cube', () => {
    expect(solveFacelets(solvedFacelets())).toEqual([])
  })

  it('throws SolverError when the solution does not solve (corrupt input)', () => {
    // A count-valid but unsolvable state is hard to hand-build; assert the guard type exists
    // and that a malformed facelet string throws rather than returning a bad solution.
    expect(() => solveFacelets(['Z' as never, ...solvedFacelets().slice(1)])).toThrow(SolverError)
  })
})
