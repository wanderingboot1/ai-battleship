import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

function buildSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  base: '/ai-battleship/',
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha()),
  },
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
