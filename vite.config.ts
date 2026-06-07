import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // cubejs's lib/solve.js is an IIFE: (function(){ ... }).call(this), and its first
    // line `Cube = this.Cube || require('./cube')` throws in the browser because top-level
    // `this` is undefined under ESM. We expose `virtual:cubejs-solver`: it imports the
    // cube-only class, then runs solve.js with `this = { Cube }` so the solver attaches to it.
    // Normal compiled module — no eval / no unsafe-eval.
    {
      name: 'cubejs-solver',
      enforce: 'pre' as const,
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
    },
    // scrambow ships a UMD bundle where short variable names (e, r, f, t…)
    // are legally re-declared across nested function scopes using var-hoisting.
    // Rolldown (Vite 8) incorrectly rejects these as illegal duplicate
    // declarations when it parses the file as an ES module.
    //
    // Fix: intercept 'scrambow', JSON-stringify the raw source, and emit a
    // tiny ESM shim that evaluates the bundle at runtime via new Function().
    // This bypasses rolldown's parser entirely for the problematic UMD code.
    {
      name: 'patch-scrambow',
      enforce: 'pre' as const,
      resolveId(id: string) {
        if (id === 'scrambow') return '\0scrambow-shim'
        return null
      },
      load(id: string) {
        if (id !== '\0scrambow-shim') return null
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('node:fs') as typeof import('node:fs')
        const raw = fs.readFileSync('./node_modules/scrambow/dist/scrambow.js', 'utf-8')
        // Embed the UMD source as a string literal. new Function() evaluates
        // it in a fresh sloppy-mode scope, so duplicate var names are fine.
        const encoded = JSON.stringify(raw)
        return {
          code: `
const _mod = { exports: {} };
// eslint-disable-next-line no-new-func
new Function('module', 'exports', ${encoded})(_mod, _mod.exports);
export const Scrambow = _mod.exports.Scrambow;
`,
          map: null,
        }
      },
    },
  ],
})
