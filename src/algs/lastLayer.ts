import type { FaceKey } from '../facelets/facelets'
import { applyMoves, solvedFacelets } from '../cube/state'

// Reverses an algorithm: "R U2 r'" → "r U2 R'".
export function invertAlg(alg: string): string {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map((m) => {
      if (m.endsWith('2')) return m
      if (m.endsWith("'")) return m.slice(0, -1)
      return m + "'"
    })
    .join(' ')
}

// The pre-alg state: what the cube looks like just before the alg is applied.
// Derived by applying the inverse to a solved cube, so the diagram always
// matches the algorithm by construction.
export function caseState(alg: string): FaceKey[] {
  return applyMoves(solvedFacelets(), invertAlg(alg))
}

/**
 * Top-down view of the last layer.
 *
 * Kociemba facelet layout: U face indices 0-8 read left→right, back→front.
 * The side strips adjacent to U are the top rows of each lateral face:
 * R 9-11 (front→back), F 18-20 (left→right), L 36-38 (back→front),
 * B 45-47 (right→left as seen from the front).
 * All strips below are re-ordered for a top-down diagram with F at the bottom:
 * back/front read left→right, left/right read back→front.
 */
export interface LastLayerView {
  topColor: FaceKey
  top: FaceKey[] // 9, rows back→front
  back: FaceKey[] // 3, left→right
  right: FaceKey[] // 3, back→front
  front: FaceKey[] // 3, left→right
  left: FaceKey[] // 3, back→front
}

const BACK_STRIP = [47, 46, 45]
const RIGHT_STRIP = [11, 10, 9]
const FRONT_STRIP = [18, 19, 20]
const LEFT_STRIP = [36, 37, 38]

// Every sticker an OLL/PLL alg is allowed to move: the U face + the 12
// adjacent side stickers. Used by tests to validate the alg data.
export const LAST_LAYER_INDICES: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8,
  ...BACK_STRIP, ...RIGHT_STRIP, ...FRONT_STRIP, ...LEFT_STRIP,
]

export function lastLayerView(alg: string): LastLayerView {
  const s = caseState(alg)
  return {
    topColor: s[4],
    top: s.slice(0, 9),
    back: BACK_STRIP.map((i) => s[i]),
    right: RIGHT_STRIP.map((i) => s[i]),
    front: FRONT_STRIP.map((i) => s[i]),
    left: LEFT_STRIP.map((i) => s[i]),
  }
}
