import { describe, it, expect } from 'vitest'
import { ScrambowSource } from './scrambowSource'

describe('ScrambowSource', () => {
  it('produces a non-empty scramble string of cube moves', () => {
    const src = new ScrambowSource()
    const scramble = src.next()
    expect(typeof scramble).toBe('string')
    expect(scramble.trim().length).toBeGreaterThan(0)
    // every token is a face turn, optionally with ' or 2
    for (const tok of scramble.trim().split(/\s+/)) {
      expect(tok).toMatch(/^[URFDLB][2']?$/)
    }
  })
  it('produces different scrambles on successive calls', () => {
    const src = new ScrambowSource()
    expect(src.next()).not.toBe(src.next())
  })
})
