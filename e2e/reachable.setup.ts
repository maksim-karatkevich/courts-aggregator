import { test as setup, expect } from '@playwright/test'

// Runs once before every other test (setup project in playwright.config.ts).
// A protected Vercel URL without the bypass header answers with Vercel's own
// login page; fail here with the reason instead of 27 confusing timeouts.
setup('deployment is reachable', async ({ request, baseURL }) => {
  const res = await request.get(baseURL!)
  const body = await res.text()
  const blocked = res.status() === 401 || res.status() === 403 || body.includes('vercel.com/login')
  expect(blocked, `Got Vercel's auth page (HTTP ${res.status()}): check VERCEL_AUTOMATION_BYPASS_SECRET`).toBe(false)
  expect(res.ok(), `${baseURL} answered HTTP ${res.status()}`).toBe(true)
  expect(body).toContain('Korty Kraków')
})
