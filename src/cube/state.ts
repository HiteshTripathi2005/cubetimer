import Cube from 'cubejs/lib/cube'
import type { FaceKey } from '../facelets/facelets'

export function solvedFacelets(): FaceKey[] {
  return new Cube().asString().split('') as FaceKey[]
}

export function applyMoves(facelets: FaceKey[], moves: string): FaceKey[] {
  const cube = Cube.fromString(facelets.join(''))
  if (moves.trim().length > 0) cube.move(moves)
  return cube.asString().split('') as FaceKey[]
}

export function faceletsAfter(input: FaceKey[], solution: string[], n: number): FaceKey[] {
  const count = Math.max(0, Math.min(n, solution.length))
  return applyMoves(input, solution.slice(0, count).join(' '))
}
