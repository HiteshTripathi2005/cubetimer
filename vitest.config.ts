import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // cubejs's lib/solve.js is an IIFE whose first line throws in the browser under ESM.
    // Expose virtual:cubejs-solver: imports the cube-only class, runs solve.js with
    // `this = { Cube }` so the solver attaches. Normal compiled module — no eval.
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
        const solveSrc = fs.readFileSync('./node_modules/cubejs/lib/solve.js', 'utf-8')
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
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
