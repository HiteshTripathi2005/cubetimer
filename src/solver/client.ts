import type { FaceKey } from '../facelets/facelets'
import type { SolverReply, SolverRequest } from './protocol'
import { SolverError } from './solve'

// Main-thread client for the solver worker. cubejs's table build takes
// multiple seconds; running it (and each solve) in a worker keeps the page
// responsive. Falls back to solving inline where Worker doesn't exist (tests).

interface Pending {
  resolve: (moves: string[]) => void
  reject: (err: Error) => void
}

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, Pending>()

function post(w: Worker, msg: SolverRequest): void {
  w.postMessage(msg)
}

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<SolverReply>) => {
    const msg = e.data
    if (msg.type === 'ready') return
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    if (msg.type === 'solved') p.resolve(msg.solution)
    else p.reject(new SolverError(msg.message))
  }
  worker.onerror = () => {
    const err = new SolverError('The solver crashed — please reload and try again.')
    for (const p of pending.values()) p.reject(err)
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

// Kick off the table build early (e.g. on page mount) so the first Solve
// doesn't pay the multi-second wait.
export function warmSolver(): void {
  if (typeof Worker === 'undefined') return
  post(getWorker(), { type: 'init' })
}

export async function solveAsync(facelets: FaceKey[]): Promise<string[]> {
  if (typeof Worker === 'undefined') {
    const { solveFacelets } = await import('./solve')
    return solveFacelets(facelets)
  }
  const id = nextId++
  return new Promise<string[]>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    post(getWorker(), { type: 'solve', id, facelets })
  })
}
