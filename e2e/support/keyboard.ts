import { expect, type Locator, type Page } from '@playwright/test'

// Presses Tab until `target` has focus. Fails if it never gets there, which
// means a keyboard-only user can't reach it.
export async function tabUntil(page: Page, target: Locator, max = 40): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((el) => el === document.activeElement)) return
  }
  throw new Error(`not reachable by keyboard after ${max} tabs: ${target}`)
}

// The focused element must show a focus indicator: an outline, or a ring
// (Tailwind's focus-visible:ring-* is a box-shadow).
export async function expectVisibleFocus(page: Page): Promise<void> {
  const style = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const cs = getComputedStyle(el)
    return { outline: cs.outlineStyle, outlineWidth: cs.outlineWidth, shadow: cs.boxShadow, tag: el.tagName }
  })
  expect(style, 'something has focus').not.toBeNull()
  const hasOutline = style!.outline !== 'none' && style!.outlineWidth !== '0px'
  const hasRing = style!.shadow !== 'none'
  expect(hasOutline || hasRing, `visible focus indicator on <${style!.tag}>`).toBe(true)
}

// Identity of the focused element, for comparing focus positions.
export async function focusedId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return ''
    if (!el.dataset.e2eFocusId) el.dataset.e2eFocusId = Math.random().toString(36).slice(2)
    return el.dataset.e2eFocusId
  })
}
