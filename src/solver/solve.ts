import type { FaceKey } from '../facelets/facelets'
import { getSolverCube } from './solverCube'
import { solvedFacelets, applyMoves } from '../cube/state'

export class SolverError extends Error {}

let initialized = false

const VALID_FACE_KEYS = new Set<string>(['U', 'R', 'F', 'D', 'L', 'B'])

// Builds the move/prune tables once (~few hundred ms). Idempotent.
export function initSolver(): void {
  if (initialized) return
  getSolverCube().initSolver()
  initialized = true
}

export function solveFacelets(facelets: FaceKey[]): string[] {
  // Guard: reject any non-FaceKey characters before they are silently coerced by fromString.
  for (const f of facelets) {
    if (!VALID_FACE_KEYS.has(f)) {
      throw new SolverError(`Invalid facelet character: '${f}'. Expected one of U R F D L B.`)
    }
  }
  const str = facelets.join('')
  if (str === solvedFacelets().join('')) return []
  initSolver()
  const Cube = getSolverCube()
  let raw: string
  try {
    raw = Cube.fromString(str).solve()
  } catch (e) {
    throw new SolverError(e instanceof Error ? e.message : 'Could not solve this cube.')
  }
  const solution = raw.trim().length ? raw.trim().split(/\s+/) : []
  // Safety net: verify the solution actually solves the input.
  if (applyMoves(facelets, solution.join(' ')).join('') !== solvedFacelets().join('')) {
    throw new SolverError('This cube state can\'t be solved — double-check the colors.')
  }
  return solution
}
