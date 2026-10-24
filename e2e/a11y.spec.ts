import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './support/guard'
import { mockSearch, searchUrl, tomorrow } from './support/mock-search'
import { clubs } from './fixtures/search-results'

// WCAG 2.1 A/AA scans in a real browser, the only place colour contrast can be
// computed. Report-only for now: violations are attached to the report and
// annotated on the test. A11Y_STRICT=1 makes them fail the run.
const STRICT = process.env.A11Y_STRICT === '1'

async function scan(page: Page, testInfo: TestInfo): Promise<void> {
  // Fade-in animations make colours mid-transition read as low contrast.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  })
  for (const v of violations) {
    testInfo.annotations.push({ type: 'a11y', description: `${v.id} (${v.impact}): ${v.help}, ${v.nodes.length} nodes` })
  }
  if (STRICT) expect(violations.map((v) => v.id)).toEqual([])
}

test('home, before searching', async ({ page }, testInfo) => {
  await mockSearch(page, clubs)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Szukaj' })).toBeVisible()
  await scan(page, testInfo)
})

test('results', async ({ page, isMobile }, testInfo) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))
  await expect(page.getByRole('button', { name: /E2E Klub Alfa/ })).toBeVisible()
  // On desktop the club opens next to the list, so scan that state too.
  if (!isMobile) {
    await page.getByRole('button', { name: /E2E Klub Alfa/ }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'E2E Klub Alfa' })).toBeVisible()
  }
  await scan(page, testInfo)
})

test('club page', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'desktop shows the club next to the results instead')
  await mockSearch(page, clubs)
  await page.goto(`/club/901?platform=tenis4u&${searchUrl(tomorrow()).slice(2)}`)
  await expect(page.getByRole('heading', { level: 2, name: 'E2E Klub Alfa' })).toBeVisible()
  await scan(page, testInfo)
})
