import type { Plugin } from 'vite'

/**
 * Vite plugin that exposes `virtual:cubejs-solver`.
 *
 * cubejs's lib/solve.js is an IIFE: `(function(){ ... }).call(this)`, and its
 * first line `Cube = this.Cube || require('./cube')` throws in the browser
 * because top-level `this` is undefined under ESM.  This plugin intercepts the
 * virtual import, reads solve.js at build/test time, and wraps it in an IIFE
 * called with `this = { Cube }` so the solver attaches correctly.
 *
 * The `require('./cube')` fallback inside solve.js is replaced with a
 * never-executed throw so rolldown's static analysis doesn't try to resolve
 * the non-existent relative path inside a virtual module.  At runtime
 * `this.Cube` is always set (we pass `{ Cube }` as `this`), so that branch is
 * dead code.
 *
 * Normal compiled module — no eval / no unsafe-eval.
 */
export function cubejsSolverPlugin(): Plugin {
  return {
    name: 'cubejs-solver',
    enforce: 'pre',
    resolveId(id: string) {
      if (id === 'virtual:cubejs-solver') return '\0virtual:cubejs-solver'
      return null
    },
    load(id: string) {
      if (id !== '\0virtual:cubejs-solver') return null
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs') as typeof import('node:fs')
      // Replace `require('./cube')` with a never-executed throw so rolldown's
      // static analysis doesn't try to resolve the non-existent relative path
      // inside the virtual module. At runtime this.Cube is always set (we pass
      // { Cube } as `this`), so the require branch is dead code.
      const solveSrc = fs.readFileSync('./node_modules/cubejs/lib/solve.js', 'utf-8')
        .replace("require('./cube')", "(() => { throw new Error('cubejs: Cube not injected') })()")
      return {
        code: `
import Cube from 'cubejs/lib/cube'
;(function () {
${solveSrc}
}).call({ Cube })
export default Cube
`,
        map: null,
      }
    },
  }
}
