import { test, expect } from './support/guard'
import { mockSearch, searchUrl, tomorrow } from './support/mock-search'
import { expectVisibleFocus, focusedId, tabUntil } from './support/keyboard'
import { alfa, clubs } from './fixtures/search-results'

// Keyboard only: page.keyboard, never click. These block the release.

test('the search form is operable by keyboard', async ({ page }) => {
  await mockSearch(page, clubs)
  await page.goto('/')

  // Date: open the picker, move a day, pick it.
  const dateButton = page.getByRole('button', { name: /^Data / })
  await tabUntil(page, dateButton)
  await expectVisibleFocus(page)
  const before = await dateButton.textContent()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('grid')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('grid')).toBeHidden()
  expect(await dateButton.textContent()).not.toBe(before)

  // Duration.
  const ninety = page.getByRole('button', { name: '90 min' })
  await tabUntil(page, ninety)
  await expectVisibleFocus(page)
  await page.keyboard.press('Enter')
  await expect(ninety).toHaveAttribute('aria-pressed', 'true')

  // Time window: open "Od", move one option down, pick it.
  const fromSelect = page.getByLabel(/^Od/)
  await tabUntil(page, fromSelect)
  await expectVisibleFocus(page)
  const fromBefore = await fromSelect.textContent()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(fromSelect).not.toHaveText(fromBefore ?? '')

  // Submit.
  await tabUntil(page, page.getByRole('button', { name: 'Szukaj' }))
  await expectVisibleFocus(page)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/forMinutes=90/)
  await expect(page.getByRole('button', { name: /E2E Klub Alfa/ })).toBeVisible()
})

test('club → booking link by keyboard', async ({ page, isMobile }) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))

  await tabUntil(page, page.getByRole('button', { name: /E2E Klub Alfa/ }))
  await expectVisibleFocus(page)
  await page.keyboard.press('Enter')
  if (isMobile) await expect(page).toHaveURL(/\/club\/901/)
  await expect(page.getByRole('heading', { level: 2, name: 'E2E Klub Alfa' })).toBeVisible()

  const book = page.getByRole('link', { name: 'Zarezerwuj →' })
  await tabUntil(page, book, 80)
  await expectVisibleFocus(page)
  await expect(book).toHaveAttribute('href', alfa.bookingUrl)
})

test('a free slot in the calendar is reachable by keyboard', async ({ page, isMobile }) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))
  await tabUntil(page, page.getByRole('button', { name: /E2E Klub Alfa/ }))
  await page.keyboard.press('Enter')
  if (isMobile) await expect(page).toHaveURL(/\/club\/901/)

  await tabUntil(page, page.getByRole('link', { name: 'Kort 1 10:00 wolny' }), 80)
  await expectVisibleFocus(page)
})

test('favorite toggles with the keyboard', async ({ page }) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))
  const star = page.getByRole('button', { name: /E2E Klub Alfa/ }).locator('..').getByRole('button', { name: 'Ulubione' })

  await tabUntil(page, star)
  await expectVisibleFocus(page)
  await page.keyboard.press('Space')
  await expect(star).toHaveAttribute('aria-pressed', 'true')
})

test('no keyboard trap', async ({ page }) => {
  await mockSearch(page, clubs)
  await page.goto(searchUrl(tomorrow()))

  const seen = new Set<string>()
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab')
    seen.add(await focusedId(page))
  }
  expect(seen.size).toBeGreaterThan(5)

  const here = await focusedId(page)
  await page.keyboard.press('Shift+Tab')
  expect(await focusedId(page)).not.toBe(here)
})
