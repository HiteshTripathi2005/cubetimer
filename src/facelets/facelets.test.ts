import { describe, it, expect } from 'vitest'
import { faceletsFromScramble, FACE_COLORS } from './facelets'

describe('faceletsFromScramble', () => {
  it('returns 54 stickers', () => {
    expect(faceletsFromScramble('').length).toBe(54)
  })
  it('solved cube has uniform faces in U,R,F,D,L,B order', () => {
    const f = faceletsFromScramble('')
    const expected = ['U', 'R', 'F', 'D', 'L', 'B']
    for (let face = 0; face < 6; face++) {
      for (let i = 0; i < 9; i++) {
        expect(f[face * 9 + i]).toBe(expected[face])
      }
    }
  })
  it('a non-trivial scramble changes the state', () => {
    const solved = faceletsFromScramble('')
    const scrambled = faceletsFromScramble("R U R' U'")
    expect(scrambled.join('')).not.toBe(solved.join(''))
  })
  it('exposes a color for each face key', () => {
    for (const key of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
      expect(typeof FACE_COLORS[key]).toBe('string')
    }
  })
})
