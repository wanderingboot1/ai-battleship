import { defineConfig, devices } from '@playwright/test'

const deployedUrl = process.env.BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: deployedUrl ?? 'http://localhost:4173/ai-battleship/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: deployedUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173/ai-battleship/',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
