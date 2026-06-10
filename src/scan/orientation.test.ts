import { describe, it, expect } from 'vitest'
import { rotateFace, fixScanOrientation } from './orientation'
import { solvedFacelets, applyMoves } from '../cube/state'

const SCRAMBLE = "R U R' U' F2 L D B' R2 U'"

describe('rotateFace', () => {
  it('four rotations return the original', () => {
    const f = applyMoves(solvedFacelets(), SCRAMBLE)
    expect(rotateFace(f, 0, 4)).toEqual(f)
  })

  it('rotates only the targeted face', () => {
    const f = applyMoves(solvedFacelets(), SCRAMBLE)
    const r = rotateFace(f, 0, 1)
    expect(r.slice(9)).toEqual(f.slice(9))
    expect(r.slice(0, 9)).not.toEqual(f.slice(0, 9))
  })
})

describe('fixScanOrientation', () => {
  it('returns a valid scan unchanged', () => {
    const f = applyMoves(solvedFacelets(), SCRAMBLE)
    expect(fixScanOrientation(f)).toEqual(f)
  })

  it('recovers a scan where the white face was captured rotated', () => {
    const f = applyMoves(solvedFacelets(), SCRAMBLE)
    const wrongTilt = rotateFace(f, 0, 1)
    expect(fixScanOrientation(wrongTilt)).toEqual(f)
  })

  it('recovers both white and yellow captured rotated', () => {
    const f = applyMoves(solvedFacelets(), SCRAMBLE)
    const wrongTilt = rotateFace(rotateFace(f, 0, 3), 27, 2)
    expect(fixScanOrientation(wrongTilt)).toEqual(f)
  })

  it('handles the solved cube (rotations are indistinguishable but identical)', () => {
    expect(fixScanOrientation(solvedFacelets())).toEqual(solvedFacelets())
  })

  it('returns null when nothing valid exists (garbage stays garbage)', () => {
    const f = applyMoves(solvedFacelets(), SCRAMBLE)
    ;[f[5], f[10]] = [f[10], f[5]] // flipped edge — no face rotation can fix this
    expect(fixScanOrientation(f)).toBeNull()
  })
})
