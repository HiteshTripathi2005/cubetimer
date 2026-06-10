import type { FaceKey } from '../facelets/facelets'
import { validatePieces } from '../solver/pieces'

// Rotating a captured 3x3 face 90° clockwise: new[i] = old[ROT_CW[i]].
const ROT_CW = [6, 3, 0, 7, 4, 1, 8, 5, 2]

export function rotateFace(facelets: FaceKey[], faceStart: number, times: number): FaceKey[] {
  let out = facelets
  for (let t = 0; t < ((times % 4) + 4) % 4; t++) {
    const prev = out
    out = [...prev]
    for (let i = 0; i < 9; i++) out[faceStart + i] = prev[faceStart + ROT_CW[i]]
  }
  return out
}

/**
 * The white (U) and yellow (D) faces are the easiest to capture in the wrong
 * orientation — tilting the cube from a different side rotates the grid by a
 * quarter turn. If the scan is invalid for that reason, try all rotations of
 * the U and D captures and return the configuration that forms a valid cube —
 * but only if it is unique, so we never silently guess between candidates.
 */
export function fixScanOrientation(facelets: FaceKey[]): FaceKey[] | null {
  const valid = new Map<string, FaceKey[]>()
  for (let u = 0; u < 4; u++) {
    for (let d = 0; d < 4; d++) {
      const f = rotateFace(rotateFace(facelets, 0, u), 27, d)
      if (validatePieces(f).ok) {
        valid.set(f.join(''), f)
        if (valid.size > 1) return null
      }
    }
  }
  return valid.size === 1 ? [...valid.values()][0] : null
}
