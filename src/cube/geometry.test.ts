import { describe, it, expect } from 'vitest'
import { NET_CELLS, STICKERS, CENTER_INDICES, faceOfIndex } from './geometry'

describe('cube/geometry — net layout', () => {
  it('NET_CELLS has 54 entries with unique facelet indices 0..53', () => {
    expect(NET_CELLS.length).toBe(54)
    const idx = NET_CELLS.map((c) => c.index).sort((a, b) => a - b)
    expect(idx).toEqual(Array.from({ length: 54 }, (_, i) => i))
  })
  it('net places U above the L F R B band and D below, in a cross', () => {
    const u = NET_CELLS.find((c) => c.index === 4)! // U center
    const f = NET_CELLS.find((c) => c.index === 22)! // F center
    const d = NET_CELLS.find((c) => c.index === 31)! // D center
    expect(u.row).toBeLessThan(f.row)
    expect(d.row).toBeGreaterThan(f.row)
  })
})

describe('cube/geometry — 3D stickers', () => {
  it('STICKERS has 54 entries, unique indices, unit-ish positions', () => {
    expect(STICKERS.length).toBe(54)
    expect(new Set(STICKERS.map((s) => s.index)).size).toBe(54)
    for (const s of STICKERS) {
      expect(s.position).toHaveLength(3)
      expect(s.normal).toHaveLength(3)
    }
  })
  it('each face has exactly 9 stickers sharing one outward normal', () => {
    const byNormal = new Map<string, number>()
    for (const s of STICKERS) {
      const k = s.normal.join(',')
      byNormal.set(k, (byNormal.get(k) ?? 0) + 1)
    }
    expect([...byNormal.values()].sort()).toEqual([9, 9, 9, 9, 9, 9])
  })
  it('center indices map to their face', () => {
    expect(CENTER_INDICES).toEqual([4, 13, 22, 31, 40, 49])
    expect(faceOfIndex(0)).toBe('U')
    expect(faceOfIndex(13)).toBe('R')
    expect(faceOfIndex(53)).toBe('B')
  })
})
