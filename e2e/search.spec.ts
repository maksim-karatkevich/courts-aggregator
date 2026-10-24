import { test, expect } from './support/guard'
import { mockSearch, searchUrl, tomorrow } from './support/mock-search'
import { alfa, clubs } from './fixtures/search-results'

const card = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('button', { name: new RegExp(name) })

test('home loads', async ({ page }) => {
  await mockSearch(page, clubs)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Korty Kraków' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Szukaj' })).toBeVisible()
})

test('search shows the fixture clubs', async ({ page }) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))
  await expect(card(page, 'E2E Klub Alfa')).toBeVisible()
  await expect(card(page, 'E2E Klub Beta')).toBeVisible()
})

test('opening a club shows its calendar and booking link', async ({ page, isMobile }) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))
  await card(page, 'E2E Klub Alfa').click()

  // Desktop opens the club next to the list; mobile navigates to its own page.
  if (isMobile) await expect(page).toHaveURL(/\/club\/901\?platform=tenis4u&/)
  await expect(page.getByRole('heading', { level: 2, name: 'E2E Klub Alfa' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Kort 1 10:00 wolny' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zarezerwuj →' })).toHaveAttribute('href', alfa.bookingUrl)
})

test('a star survives reload when signed out', async ({ page }) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))
  const star = () => card(page, 'E2E Klub Alfa').locator('..').getByRole('button', { name: 'Ulubione' })

  await star().click()
  await expect(star()).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(star()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: '⭐ Ulubione' })).toBeVisible()
})

test('empty results show the empty message', async ({ page }) => {
  await mockSearch(page, [])
  await page.goto(searchUrl(tomorrow()))
  await expect(page.getByText('Brak dostępnych kortów w wybranym terminie.')).toBeVisible()
})

test.describe('a failing search', () => {
  // The browser logs the mocked 500 itself; that's the point of this test.
  test.use({ allowedConsoleErrors: [/status of 500/] })

  test('shows the error message', async ({ page }) => {
    await mockSearch(page, { status: 500 })
    await page.goto(searchUrl(tomorrow()))
    // React Query retries before giving up, so the message takes a few seconds.
    await expect(page.getByText('Błąd podczas wyszukiwania. Spróbuj ponownie.')).toBeVisible({ timeout: 15_000 })
  })
})
