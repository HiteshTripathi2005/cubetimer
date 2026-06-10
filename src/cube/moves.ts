// Parse a cube move token (R, U', F2, r, M, x2, …) into the layers + signed
// rotation the 3D animator should perform. Angle is in radians: a single
// clockwise quarter turn (viewed from outside that face) per standard cube
// notation. The absolute signs are verified visually in the browser; tests pin
// structure + inverse.

export type Axis = 'x' | 'y' | 'z'

export interface MoveTurn {
  axis: Axis
  /** Cubie coordinates along `axis` that rotate (subset of -1, 0, 1). */
  slices: readonly number[]
  angle: number // signed radians
}

const QUARTER = Math.PI / 2

// For each move letter: axis, affected slices, and the sign of one clockwise
// quarter turn about that axis (right-hand rule in x-right / y-up / z-front).
// Wide turns add the middle slice; M/E/S follow L/D/F; x/y/z follow R/U/F.
const MOVE_BASE: Record<string, { axis: Axis; slices: readonly number[]; cw: 1 | -1 }> = {
  U: { axis: 'y', slices: [1], cw: -1 },
  D: { axis: 'y', slices: [-1], cw: 1 },
  R: { axis: 'x', slices: [1], cw: -1 },
  L: { axis: 'x', slices: [-1], cw: 1 },
  F: { axis: 'z', slices: [1], cw: -1 },
  B: { axis: 'z', slices: [-1], cw: 1 },
  u: { axis: 'y', slices: [1, 0], cw: -1 },
  d: { axis: 'y', slices: [-1, 0], cw: 1 },
  r: { axis: 'x', slices: [1, 0], cw: -1 },
  l: { axis: 'x', slices: [-1, 0], cw: 1 },
  f: { axis: 'z', slices: [1, 0], cw: -1 },
  b: { axis: 'z', slices: [-1, 0], cw: 1 },
  M: { axis: 'x', slices: [0], cw: 1 },
  E: { axis: 'y', slices: [0], cw: 1 },
  S: { axis: 'z', slices: [0], cw: -1 },
  x: { axis: 'x', slices: [1, 0, -1], cw: -1 },
  y: { axis: 'y', slices: [1, 0, -1], cw: -1 },
  z: { axis: 'z', slices: [1, 0, -1], cw: -1 },
}

export function parseMove(token: string): MoveTurn {
  const base = MOVE_BASE[token[0]]
  if (!base) throw new Error(`Unknown move: ${token}`)
  const mod = token.slice(1)
  const quarters = mod === "'" ? -1 : mod === '2' ? 2 : 1
  return { axis: base.axis, slices: base.slices, angle: base.cw * quarters * QUARTER }
}

// The move that undoes `token` (for stepping backward).
export function invertMove(token: string): string {
  const face = token[0]
  const mod = token.slice(1)
  if (mod === '2') return token
  if (mod === "'") return face
  return `${face}'`
}
