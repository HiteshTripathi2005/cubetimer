import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { cubejsSolverPlugin } from './vite/cubejsSolverPlugin'


// https://vite.dev/config/
export default defineConfig({
  // The solver worker imports virtual:cubejs-solver (via solve.ts), so the
  // worker bundle needs the same plugin.
  worker: {
    format: 'es',
    plugins: () => [cubejsSolverPlugin()],
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    cubejsSolverPlugin(),
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
