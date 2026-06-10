import type { FaceKey } from '../facelets/facelets'
import { validatePieces } from './pieces'

const FACES: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']
const CENTER_INDICES = [4, 13, 22, 31, 40, 49]
const FACE_NAMES: Record<FaceKey, string> = {
  U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue',
}

export type ValidateResult =
  | { ok: true; facelets: FaceKey[] }
  | { ok: false; message: string }

// Count painted stickers per color (nulls ignored). Used to surface which colors
// are off (≠ 9) so the UI can show a tally and highlight the offending stickers.
export function colorCounts(grid: (FaceKey | null)[]): Record<FaceKey, number> {
  const counts: Record<FaceKey, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const c of grid) if (c !== null) counts[c] += 1
  return counts
}

// The colors whose painted count is not exactly 9 (the ones a user must fix).
export function offCountColors(grid: (FaceKey | null)[]): FaceKey[] {
  const counts = colorCounts(grid)
  return FACES.filter((f) => counts[f] !== 9)
}

export function validateGrid(grid: (FaceKey | null)[]): ValidateResult {
  if (grid.length !== 54) return { ok: false, message: 'Cube data is the wrong size.' }
  if (grid.some((c) => c === null)) {
    return { ok: false, message: 'Some stickers aren’t painted yet — fill in all 54.' }
  }
  const facelets = grid as FaceKey[]

  // Centers must be the six distinct face colors in their fixed positions.
  for (let i = 0; i < 6; i++) {
    if (facelets[CENTER_INDICES[i]] !== FACES[i]) {
      return { ok: false, message: 'Each face’s center color must stay unique.' }
    }
  }

  // Each color exactly 9.
  const counts: Record<string, number> = {}
  for (const c of facelets) counts[c] = (counts[c] ?? 0) + 1
  for (const face of FACES) {
    const n = counts[face] ?? 0
    if (n !== 9) {
      return { ok: false, message: `You have ${n} ${FACE_NAMES[face]} stickers (need 9).` }
    }
  }

  // Counts being right doesn't make the cube solvable — check the pieces too,
  // otherwise the solver searches forever on an impossible state.
  const pieces = validatePieces(facelets)
  if (!pieces.ok) return pieces

  return { ok: true, facelets }
}
