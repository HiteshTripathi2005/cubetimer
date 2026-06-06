import { describe, it, expect } from 'vitest'
import { uid } from './uid'

describe('uid', () => {
  it('returns a unique string each call', () => {
    const a = uid()
    const b = uid()
    expect(typeof a).toBe('string')
    expect(a.length).toBeGreaterThan(0)
    expect(a).not.toBe(b)
  })
})
