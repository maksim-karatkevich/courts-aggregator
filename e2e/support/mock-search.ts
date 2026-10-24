import { format, addDays } from 'date-fns'
import type { Page } from '@playwright/test'
import type { ClubResult } from '../../src/lib/types'

// Answers the browser's /api/search requests, so the deployed app never
// reaches the real booking systems.
export async function mockSearch(page: Page, reply: ClubResult[] | { status: number }): Promise<void> {
  await page.route('**/api/search?**', (route) =>
    Array.isArray(reply)
      ? route.fulfill({ json: reply })
      : route.fulfill({ status: reply.status, json: { error: 'mocked failure' } }),
  )
}

export function tomorrow(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

// Same params toQueryString (src/features/search/model/search-url.ts) writes.
export function searchUrl(date: string): string {
  return `/?date=${date}&from=07:00&to=23:00&forMinutes=120`
}
