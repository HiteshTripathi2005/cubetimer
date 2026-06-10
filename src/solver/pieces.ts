import type { FaceKey } from '../facelets/facelets'

// Piece-level solvability check. Color counts alone don't guarantee a cube is
// solvable — a single mis-scanned sticker can twist a corner or flip an edge,
// and cubejs's solver loops forever on such states instead of throwing. This
// runs the standard checks: every piece exists exactly once, corner twist sum
// ≡ 0 (mod 3), edge flip sum ≡ 0 (mod 2), and permutation parity matches.

const FACE_NAMES: Record<FaceKey, string> = {
  U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue',
}

// Kociemba facelet indices for each piece slot (0-indexed into the 54-array).
// Corners list the U/D facelet first, then clockwise around the corner.
const CORNER_SLOTS: [number, number, number][] = [
  [8, 9, 20],   // URF
  [6, 18, 38],  // UFL
  [0, 36, 47],  // ULB
  [2, 45, 11],  // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51], // DRB
]
const CORNER_PIECES: [FaceKey, FaceKey, FaceKey][] = [
  ['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'],
  ['D', 'F', 'R'], ['D', 'L', 'F'], ['D', 'B', 'L'], ['D', 'R', 'B'],
]

// Edges list the reference facelet first (U/D facelet, or F/B for E-slice
// edges); piece pairs are written reference color first.
const EDGE_SLOTS: [number, number][] = [
  [5, 10],  // UR
  [7, 19],  // UF
  [3, 37],  // UL
  [1, 46],  // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
]
const EDGE_PIECES: [FaceKey, FaceKey][] = [
  ['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'],
  ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'],
  ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R'],
]

export type PieceResult = { ok: true } | { ok: false; message: string }

const sameSet = (a: readonly FaceKey[], b: readonly FaceKey[]) =>
  a.length === b.length && a.every((c) => b.includes(c))

const colorList = (s: readonly FaceKey[]) => s.map((c) => FACE_NAMES[c]).join(' + ')

function permutationParity(perm: number[]): number {
  let parity = 0
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) parity ^= 1
    }
  }
  return parity
}

export function validatePieces(facelets: FaceKey[]): PieceResult {
  const cornerPerm: number[] = []
  let twist = 0
  const seenCorners = new Set<number>()
  for (const slot of CORNER_SLOTS) {
    const s = slot.map((i) => facelets[i]) as FaceKey[]
    const piece = CORNER_PIECES.findIndex((p) => sameSet(p, s))
    if (piece < 0) {
      return { ok: false, message: `A corner shows ${colorList(s)} — that piece doesn't exist on a real cube. Fix those stickers (or rescan that area).` }
    }
    if (seenCorners.has(piece)) {
      return { ok: false, message: `The ${colorList(CORNER_PIECES[piece])} corner appears twice — some corner stickers are mixed up.` }
    }
    seenCorners.add(piece)
    cornerPerm.push(piece)
    twist += s.findIndex((c) => c === 'U' || c === 'D')
  }
  if (twist % 3 !== 0) {
    return { ok: false, message: 'A corner is twisted in place — this cube can\'t be solved. One corner\'s colors are rotated; fix or rescan it.' }
  }

  const edgePerm: number[] = []
  let flip = 0
  const seenEdges = new Set<number>()
  for (const slot of EDGE_SLOTS) {
    const s = slot.map((i) => facelets[i]) as FaceKey[]
    const piece = EDGE_PIECES.findIndex((p) => sameSet(p, s))
    if (piece < 0) {
      return { ok: false, message: `An edge shows ${colorList(s)} — that piece doesn't exist on a real cube. Fix those stickers (or rescan that area).` }
    }
    if (seenEdges.has(piece)) {
      return { ok: false, message: `The ${colorList(EDGE_PIECES[piece])} edge appears twice — some edge stickers are mixed up.` }
    }
    seenEdges.add(piece)
    edgePerm.push(piece)
    if (s[0] !== EDGE_PIECES[piece][0]) flip += 1
  }
  if (flip % 2 !== 0) {
    return { ok: false, message: 'An edge is flipped in place — this cube can\'t be solved. One edge\'s two colors are swapped; fix or rescan it.' }
  }

  if (permutationParity(cornerPerm) !== permutationParity(edgePerm)) {
    return { ok: false, message: 'Two pieces are swapped — this cube can\'t be solved. Two stickers (or pieces) traded places; re-check the colors.' }
  }

  return { ok: true }
}
