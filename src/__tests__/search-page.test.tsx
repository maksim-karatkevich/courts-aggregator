// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Platform, type ClubResult } from '@/lib/types'

let search = ''
const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useSearchParams: () => new URLSearchParams(search),
}))
vi.mock('@/features/account/hooks/use-preferences', () => ({
  usePreferences: () => ({ prefs: { favorites: [], booked: [] }, failed: false }),
}))
vi.mock('@/features/account/hooks/use-record-booking-click', () => ({ useRecordBookingClick: () => vi.fn() }))
vi.mock('@/features/account/hooks/use-favorites-save-error', () => ({ useFavoritesSaveError: () => false }))
vi.mock('@/features/account/components/StarButton', () => ({ StarButton: () => null }))

import { SearchPage } from '@/features/search/components/SearchPage'

const club: ClubResult = {
  id: '1',
  clubName: 'Alpha',
  platform: Platform.Tenis4u,
  slots: [{ from: '10:00', to: '11:00', courtName: 'K1' }],
  daySlots: [{ from: '10:00', to: '11:00', courtName: 'K1' }],
  bookingUrl: 'https://example.com',
}

const QUERY = 'date=2026-10-20&from=10%3A00&to=12%3A00&forMinutes=60'

let fetchMock: ReturnType<typeof vi.fn>

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SearchPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [club] })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  replace.mockClear()
  search = QUERY
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SearchPage', () => {
  it('seeds the form from the URL and fetches results once', async () => {
    renderPage()
    expect(await screen.findByText('Alpha')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/search?${QUERY}`)
    expect(screen.getByText('20.10.2026')).toBeTruthy()
  })

  it('replaces the URL when a different search is submitted', async () => {
    renderPage()
    await screen.findByText('Alpha')
    fireEvent.click(screen.getByRole('button', { name: '90 min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace.mock.calls[0][0]).toMatch(/^\/\?date=2026-10-20&.*forMinutes=90/)
  })

  it('refetches instead of navigating when the same params are submitted', async () => {
    renderPage()
    await screen.findByText('Alpha')
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows Szukam… while a fetch is pending', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(await screen.findByRole('button', { name: 'Szukam…' })).toBeTruthy()
  })
})
