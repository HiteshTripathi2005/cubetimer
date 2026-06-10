import { describe, it, expect } from 'vitest'
import type { FaceKey } from '../facelets/facelets'
import { validatePieces } from './pieces'
import { solvedFacelets, applyMoves } from '../cube/state'

const twistCorner = (f: FaceKey[], slot: number[]): FaceKey[] => {
  const out = [...f]
  const [a, b, c] = slot
  out[a] = f[b]
  out[b] = f[c]
  out[c] = f[a]
  return out
}

describe('validatePieces', () => {
  it('accepts solved and scrambled cubes', () => {
    expect(validatePieces(solvedFacelets()).ok).toBe(true)
    const scrambled = applyMoves(solvedFacelets(), "R U R' U' F2 L D B' R2 U' M E2 r")
    expect(validatePieces(scrambled).ok).toBe(true)
  })

  it('rejects a twisted corner', () => {
    const f = twistCorner(solvedFacelets(), [8, 9, 20]) // URF
    const res = validatePieces(f)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toMatch(/corner is twisted/i)
  })

  it('rejects a flipped edge', () => {
    const f = [...solvedFacelets()]
    ;[f[5], f[10]] = [f[10], f[5]] // UR edge
    const res = validatePieces(f)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toMatch(/edge is flipped/i)
  })

  it('rejects two swapped edges (parity)', () => {
    const f = [...solvedFacelets()]
    ;[f[5], f[7]] = [f[7], f[5]]   // swap UR and UF facelets on U
    ;[f[10], f[19]] = [f[19], f[10]] // and their side facelets
    const res = validatePieces(f)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toMatch(/swapped/i)
  })

  it('rejects an impossible piece (white+yellow edge)', () => {
    const f = [...solvedFacelets()]
    f[5] = 'D'
    f[10] = 'U' // UR edge now shows yellow+white — opposite colors never share a piece
    const res = validatePieces(f)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toMatch(/doesn't exist/i)
  })

  it('rejects a duplicated piece', () => {
    const scrambled = applyMoves(solvedFacelets(), 'R U2')
    // overwrite the UR edge with a copy of the UF edge's colors
    const f = [...scrambled]
    f[5] = scrambled[7]
    f[10] = scrambled[19]
    const res = validatePieces(f)
    expect(res.ok).toBe(false)
  })
})
