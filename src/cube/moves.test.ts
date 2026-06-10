import { describe, it, expect } from 'vitest'
import { parseMove, invertMove } from './moves'

describe('parseMove', () => {
  it('maps each face to the right axis/slice', () => {
    expect(parseMove('R')).toMatchObject({ axis: 'x', slices: [1] })
    expect(parseMove('L')).toMatchObject({ axis: 'x', slices: [-1] })
    expect(parseMove('U')).toMatchObject({ axis: 'y', slices: [1] })
    expect(parseMove('D')).toMatchObject({ axis: 'y', slices: [-1] })
    expect(parseMove('F')).toMatchObject({ axis: 'z', slices: [1] })
    expect(parseMove('B')).toMatchObject({ axis: 'z', slices: [-1] })
  })

  it('wide turns include the middle slice and match the face turn direction', () => {
    expect(parseMove('r')).toMatchObject({ axis: 'x', slices: [1, 0] })
    expect(parseMove('r').angle).toBeCloseTo(parseMove('R').angle)
    expect(parseMove("f'")).toMatchObject({ axis: 'z', slices: [1, 0] })
  })

  it('slice moves turn only the middle layer, following L/D/F', () => {
    expect(parseMove('M')).toMatchObject({ axis: 'x', slices: [0] })
    expect(parseMove('M').angle).toBeCloseTo(parseMove('L').angle)
    expect(parseMove('E').angle).toBeCloseTo(parseMove('D').angle)
    expect(parseMove('S').angle).toBeCloseTo(parseMove('F').angle)
  })

  it('rotations turn all three slices, following R/U/F', () => {
    expect(parseMove('x')).toMatchObject({ axis: 'x', slices: [1, 0, -1] })
    expect(parseMove('y2')).toMatchObject({ axis: 'y', slices: [1, 0, -1] })
    expect(parseMove('x').angle).toBeCloseTo(parseMove('R').angle)
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
