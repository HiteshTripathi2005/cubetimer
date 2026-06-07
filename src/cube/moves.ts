// Parse a cube move token (R, U', F2, …) into the layer + signed rotation the
// 3D animator should perform. Angle is in radians: a single clockwise quarter
// turn (viewed from outside that face) per standard cube notation. The absolute
// signs are verified visually in the browser; tests pin structure + inverse.

export type Axis = 'x' | 'y' | 'z'

export interface MoveTurn {
  axis: Axis
  slice: -1 | 1
  angle: number // signed radians
}

const QUARTER = Math.PI / 2

// For each face: which axis/slice its layer is, and the sign of one clockwise
// quarter turn about that axis (right-hand rule in x-right / y-up / z-front).
const FACE_MOVE: Record<string, { axis: Axis; slice: -1 | 1; cw: 1 | -1 }> = {
  U: { axis: 'y', slice: 1, cw: -1 },
  D: { axis: 'y', slice: -1, cw: 1 },
  R: { axis: 'x', slice: 1, cw: -1 },
  L: { axis: 'x', slice: -1, cw: 1 },
  F: { axis: 'z', slice: 1, cw: -1 },
  B: { axis: 'z', slice: -1, cw: 1 },
}

export function parseMove(token: string): MoveTurn {
  const base = FACE_MOVE[token[0]]
  if (!base) throw new Error(`Unknown move: ${token}`)
  const mod = token.slice(1)
  const quarters = mod === "'" ? -1 : mod === '2' ? 2 : 1
  return { axis: base.axis, slice: base.slice, angle: base.cw * quarters * QUARTER }
}

// The move that undoes `token` (for stepping backward).
export function invertMove(token: string): string {
  const face = token[0]
  const mod = token.slice(1)
  if (mod === '2') return token
  if (mod === "'") return face
  return `${face}'`
}
