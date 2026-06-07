// The 26 visible cubies, derived from the shared sticker geometry so the 3D
// cube, the 2D net, and the solver all agree on facelet indices. Each cubie
// knows its grid position and which stickers (facelet index + outward normal)
// sit on its outer faces.

import type { Axis } from './moves'
import { STICKERS } from './geometry'

type Vec3 = [number, number, number]

export interface CubieSticker {
  index: number // facelet index (0..53) → color
  normal: Vec3 // outward face direction
}

export interface Cubie {
  position: Vec3 // grid coords, each in {-1, 0, 1}
  stickers: CubieSticker[]
}

// A sticker position has ±1.5 on its normal axis and {-1,0,1} on the others;
// map it to the owning cubie's grid coordinate.
function cubieCoord(p: number): number {
  return Math.abs(p) > 1 ? Math.sign(p) : p
}

export const CUBIES: Cubie[] = (() => {
  const byKey = new Map<string, Cubie>()
  for (const s of STICKERS) {
    const position: Vec3 = [
      cubieCoord(s.position[0]),
      cubieCoord(s.position[1]),
      cubieCoord(s.position[2]),
    ]
    const key = position.join(',')
    let cubie = byKey.get(key)
    if (!cubie) {
      cubie = { position, stickers: [] }
      byKey.set(key, cubie)
    }
    cubie.stickers.push({ index: s.index, normal: s.normal })
  }
  return [...byKey.values()]
})()

const AXIS_INDEX: Record<Axis, number> = { x: 0, y: 1, z: 2 }

// The 9 cubies whose `axis` coordinate equals `slice` (the layer that turns).
export function layerCubies(axis: Axis, slice: number): Cubie[] {
  const i = AXIS_INDEX[axis]
  return CUBIES.filter((c) => c.position[i] === slice)
}
