import { describe, it, expect } from 'vitest'
import { solvedFacelets, applyMoves, faceletsAfter } from './state'

describe('cube/state', () => {
  it('solved state is 54 stickers, each face uniform in U,R,F,D,L,B order', () => {
    const f = solvedFacelets()
    expect(f.length).toBe(54)
    const expected = ['U', 'R', 'F', 'D', 'L', 'B']
    for (let face = 0; face < 6; face++) {
      for (let i = 0; i < 9; i++) expect(f[face * 9 + i]).toBe(expected[face])
    }
  })

  it('applyMoves changes state and is invertible', () => {
    const solved = solvedFacelets()
    const moved = applyMoves(solved, 'R')
    expect(moved.join('')).not.toBe(solved.join(''))
    expect(applyMoves(moved, "R'").join('')).toBe(solved.join(''))
  })

  it('applyMoves with empty string is a no-op', () => {
    const solved = solvedFacelets()
    expect(applyMoves(solved, '   ').join('')).toBe(solved.join(''))
  })

  it('faceletsAfter applies the first n moves of a solution', () => {
    const input = applyMoves(solvedFacelets(), "R U R' U'")
    const solution = ['U', 'R', "U'", 'L']
    expect(faceletsAfter(input, solution, 0).join('')).toBe(input.join(''))
    expect(faceletsAfter(input, solution, 2).join('')).toBe(applyMoves(input, 'U R').join(''))
    expect(faceletsAfter(input, solution, 99).join('')).toBe(applyMoves(input, "U R U' L").join(''))
  })
})
