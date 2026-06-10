import type { FaceKey } from '../facelets/facelets'

// Messages between the main thread (client.ts) and the solver worker.
export type SolverRequest =
  | { type: 'init' }
  | { type: 'solve'; id: number; facelets: FaceKey[] }

export type SolverReply =
  | { type: 'ready' }
  | { type: 'solved'; id: number; solution: string[] }
  | { type: 'error'; id: number; message: string }
