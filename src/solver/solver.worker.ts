import { initSolver, solveFacelets } from './solve'
import type { SolverRequest, SolverReply } from './protocol'

// `self` is typed as Window under the DOM lib; narrow to the worker shape we use.
const ctx = self as unknown as {
  postMessage(msg: SolverReply): void
  onmessage: ((e: MessageEvent<SolverRequest>) => void) | null
}

ctx.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    initSolver()
    ctx.postMessage({ type: 'ready' })
    return
  }
  try {
    const solution = solveFacelets(msg.facelets)
    ctx.postMessage({ type: 'solved', id: msg.id, solution })
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      id: msg.id,
      message: err instanceof Error ? err.message : 'Could not solve this cube.',
    })
  }
}
