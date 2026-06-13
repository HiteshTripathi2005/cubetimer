import { describe, it, expect } from 'vitest'
import type { FaceKey } from '../facelets/facelets'
import { classifyScan, classifyFace, nearestPaletteFace, labDistance, type RGB } from './classify'
import { solvedFacelets, applyMoves } from '../cube/state'

// Realistic-ish camera readings of the six sticker colors (dimmer + tinted
// versus the ideal palette).
const CAMERA: Record<FaceKey, RGB> = {
  U: { r: 205, g: 210, b: 200 }, // white, slightly grey
  R: { r: 190, g: 30, b: 40 },   // red
  F: { r: 25, g: 150, b: 70 },   // green
  D: { r: 215, g: 190, b: 40 },  // yellow
  L: { r: 230, g: 130, b: 30 },  // orange
  B: { r: 20, g: 70, b: 170 },   // blue
}

const noise = (c: RGB, n: number): RGB => ({
  r: Math.min(255, Math.max(0, c.r + n)),
  g: Math.min(255, Math.max(0, c.g - n)),
  b: Math.min(255, Math.max(0, c.b + n)),
})

function samplesFor(facelets: FaceKey[]): Record<FaceKey, RGB[]> {
  const order: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']
  const out = {} as Record<FaceKey, RGB[]>
  order.forEach((face, fi) => {
    out[face] = Array.from({ length: 9 }, (_, i) => noise(CAMERA[facelets[fi * 9 + i]], ((i % 3) - 1) * 12))
  })
  return out
}

describe('labDistance', () => {
  it('is zero for identical colors and larger for different hues', () => {
    expect(labDistance(CAMERA.R, CAMERA.R)).toBe(0)
    expect(labDistance(CAMERA.R, CAMERA.B)).toBeGreaterThan(labDistance(CAMERA.R, CAMERA.L))
  })
})

describe('classifyScan', () => {
  it('recovers a solved cube from noisy camera colors', () => {
    expect(classifyScan(samplesFor(solvedFacelets()))).toEqual(solvedFacelets())
  })

  it('recovers a scrambled cube, including red vs orange stickers', () => {
    const scrambled = applyMoves(solvedFacelets(), "R U R' U' F2 L D B' R2 U'")
    expect(classifyScan(samplesFor(scrambled))).toEqual(scrambled)
  })
})

describe('nearestPaletteFace', () => {
  it('matches noisy camera colors to the right standard color', () => {
    expect(nearestPaletteFace(CAMERA.R)).toBe('R')
    expect(nearestPaletteFace(CAMERA.L)).toBe('L') // orange, distinct from red
    expect(nearestPaletteFace(CAMERA.U)).toBe('U')
  })
})

describe('classifyFace', () => {
  it('locks the center to the given face regardless of what was sampled', () => {
    // A green face whose center sample reads reddish — center stays green.
    const samples = Array.from({ length: 9 }, () => CAMERA.F)
    samples[4] = CAMERA.R
    expect(classifyFace(samples, 'F')[4]).toBe('F')
  })

  it('classifies the other eight blocks against the palette', () => {
    const samples = [
      CAMERA.U, CAMERA.R, CAMERA.F,
      CAMERA.D, CAMERA.L /* center sample */, CAMERA.B,
      CAMERA.U, CAMERA.R, CAMERA.F,
    ]
    expect(classifyFace(samples, 'F')).toEqual([
      'U', 'R', 'F',
      'D', 'F', 'B', // center forced to F
      'U', 'R', 'F',
    ])
  })
})
