import { describe, it, expect } from 'vitest'
import { parseMove, invertMove } from './moves'

describe('parseMove', () => {
  it('maps each face to the right axis/slice', () => {
    expect(parseMove('R')).toMatchObject({ axis: 'x', slice: 1 })
    expect(parseMove('L')).toMatchObject({ axis: 'x', slice: -1 })
    expect(parseMove('U')).toMatchObject({ axis: 'y', slice: 1 })
    expect(parseMove('D')).toMatchObject({ axis: 'y', slice: -1 })
    expect(parseMove('F')).toMatchObject({ axis: 'z', slice: 1 })
    expect(parseMove('B')).toMatchObject({ axis: 'z', slice: -1 })
  })

  it("prime is the negated angle of the base move", () => {
    expect(parseMove("R'").angle).toBeCloseTo(-parseMove('R').angle)
  })

  it('double is a half turn', () => {
    expect(Math.abs(parseMove('R2').angle)).toBeCloseTo(Math.PI)
  })

  it('base move is a quarter turn', () => {
    expect(Math.abs(parseMove('U').angle)).toBeCloseTo(Math.PI / 2)
  })

  it('throws on an unknown move', () => {
    expect(() => parseMove('Z')).toThrow()
  })
})

describe('invertMove', () => {
  it('inverts quarter turns and is identity on doubles', () => {
    expect(invertMove('R')).toBe("R'")
    expect(invertMove("R'")).toBe('R')
    expect(invertMove('R2')).toBe('R2')
    expect(invertMove('U')).toBe("U'")
  })

  it('inverting twice returns the original quarter turn', () => {
    expect(invertMove(invertMove('F'))).toBe('F')
  })
})
