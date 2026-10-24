import { test as base, expect } from '@playwright/test'

// Every E2E test uses this `test`. It adds two guards:
// - a catch-all route for /api/search, registered first so a test's own
//   mockSearch (registered later) takes precedence. Anything the mock doesn't
//   answer is aborted and recorded, so the real booking APIs are never hit.
// - console errors are collected; a test fails if the page logged any that
//   don't match its `allowedConsoleErrors` (set with test.use).
export const test = base.extend<{ allowedConsoleErrors: RegExp[]; guards: void }>({
  allowedConsoleErrors: [[], { option: true }],
  guards: [
    async ({ page, allowedConsoleErrors }, use) => {
      const unmocked: string[] = []
      const consoleErrors: string[] = []
      await page.route('**/api/search**', (route) => {
        unmocked.push(route.request().url())
        return route.abort()
      })
      page.on('console', (msg) => {
        const text = msg.text()
        if (msg.type() === 'error' && !allowedConsoleErrors.some((re) => re.test(text))) consoleErrors.push(text)
      })

      await use()

      expect(unmocked, 'requests to /api/search that no mock answered').toEqual([])
      expect(consoleErrors, 'console errors on the page').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
