import { defineConfig, devices } from '@playwright/test'

// E2E_BASE_URL set → test that deployment (CI, against Vercel).
// Unset → run `next dev` on 3100 with .env.local (the dev database). Not
// `next build`: that loads .env.production.local, i.e. production data.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3100'
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never', outputFolder: '../playwright-report' }], ['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Lets CI through Vercel Deployment Protection on the unique deployment URL.
    extraHTTPHeaders: bypass
      ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' }
      : undefined,
  },
  projects: [
    { name: 'setup', testMatch: /reachable\.setup\.ts/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, dependencies: ['setup'] },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npx next dev -p 3100',
        cwd: '..',
        url: 'http://localhost:3100',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
