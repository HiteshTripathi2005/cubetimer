import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { cubejsSolverPlugin } from './vite/cubejsSolverPlugin'

export default defineConfig({
  plugins: [
    react(),
    cubejsSolverPlugin(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
