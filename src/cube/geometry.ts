import type { FaceKey } from '../facelets/facelets'

export const CENTER_INDICES = [4, 13, 22, 31, 40, 49] as const

const FACES: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']

export function faceOfIndex(index: number): FaceKey {
  return FACES[Math.floor(index / 9)]
}

// ---- 2D net layout (cross): U on top, L F R B middle band, D bottom ----
// Column/row are in 3x3-face units; each face occupies a 3x3 block.
const NET_FACE_ORIGIN: Record<FaceKey, { col: number; row: number }> = {
  U: { col: 3, row: 0 },
  L: { col: 0, row: 3 },
  F: { col: 3, row: 3 },
  R: { col: 6, row: 3 },
  B: { col: 9, row: 3 },
  D: { col: 3, row: 6 },
}

export interface NetCell { index: number; row: number; col: number; face: FaceKey }

export const NET_CELLS: NetCell[] = FACES.flatMap((face, faceIdx) => {
  const origin = NET_FACE_ORIGIN[face]
  return Array.from({ length: 9 }, (_, i) => ({
    index: faceIdx * 9 + i,
    face,
    row: origin.row + Math.floor(i / 3),
    col: origin.col + (i % 3),
  }))
})

// ---- 3D sticker placement ----
// Cube spans [-1.5, 1.5]; stickers sit just outside each face at ±1.5.
// For each face we define: outward normal, and the in-plane (right, down)
// basis used to lay out the 3x3 reading order (matching the net above so the
// 2D and 3D views share facelet indices).
type Vec3 = [number, number, number]
interface FaceBasis { normal: Vec3; right: Vec3; down: Vec3 }

const FACE_BASIS: Record<FaceKey, FaceBasis> = {
  // Up: looking down (-Y view), reading rows go back→front (z: -1→+1), cols left→right (x: -1→+1)
  U: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  // Right: looking along -X, cols front→back (z:+1→-1), rows top→bottom (y:+1→-1)
  R: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  // Front: looking along -Z, cols left→right (x:-1→+1), rows top→bottom (y:+1→-1)
  F: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  // Down: looking up (+Y), rows front→back (z:+1→-1), cols left→right (x:-1→+1)
  D: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  // Left: looking along +X, cols back→front (z:-1→+1), rows top→bottom (y:+1→-1)
  L: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
  // Back: looking along +Z, cols right→left (x:+1→-1), rows top→bottom (y:+1→-1)
  B: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
}

export interface Sticker { index: number; face: FaceKey; position: Vec3; normal: Vec3 }

const GAP = 1 // grid step in cube units (cubie size)
const SURFACE = 1.5 // half-extent

function add(a: Vec3, b: Vec3, k: number): Vec3 {
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
}

export const STICKERS: Sticker[] = FACES.flatMap((face, faceIdx) => {
  const b = FACE_BASIS[face]
  const center: Vec3 = [b.normal[0] * SURFACE, b.normal[1] * SURFACE, b.normal[2] * SURFACE]
  return Array.from({ length: 9 }, (_, i) => {
    const r = Math.floor(i / 3) - 1 // -1,0,1
    const c = (i % 3) - 1
    let pos = add(center, b.right, c * GAP)
    pos = add(pos, b.down, r * GAP)
    return { index: faceIdx * 9 + i, face, position: pos, normal: b.normal }
  })
})
