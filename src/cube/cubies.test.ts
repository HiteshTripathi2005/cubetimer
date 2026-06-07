import { describe, it, expect } from 'vitest'
import { CUBIES, layerCubies } from './cubies'

describe('CUBIES', () => {
  it('has 26 cubies (3^3 minus the hidden core)', () => {
    expect(CUBIES.length).toBe(26)
  })

  it('every grid coord is in {-1,0,1} and no (0,0,0) core', () => {
    for (const c of CUBIES) {
      for (const v of c.position) expect([-1, 0, 1]).toContain(v)
      expect(c.position.join(',')).not.toBe('0,0,0')
    }
  })

  it('assigns all 54 stickers exactly once', () => {
    const indices = CUBIES.flatMap((c) => c.stickers.map((s) => s.index)).sort((a, b) => a - b)
    expect(indices).toEqual(Array.from({ length: 54 }, (_, i) => i))
  })

  it('has 8 corners (3 stickers), 12 edges (2), 6 centers (1)', () => {
    const counts = { 1: 0, 2: 0, 3: 0 } as Record<number, number>
    for (const c of CUBIES) counts[c.stickers.length] += 1
    expect(counts[3]).toBe(8)
    expect(counts[2]).toBe(12)
    expect(counts[1]).toBe(6)
  })
})

describe('layerCubies', () => {
  it('returns 9 cubies for any face layer', () => {
    expect(layerCubies('x', 1).length).toBe(9)
    expect(layerCubies('y', -1).length).toBe(9)
    expect(layerCubies('z', 1).length).toBe(9)
  })
})
