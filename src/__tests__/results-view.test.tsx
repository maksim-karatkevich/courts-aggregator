// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { expectNoA11yViolations } from './helpers/axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Platform, type ClubResult, type SearchParams } from '@/lib/types'
import { clubHref } from '@/features/club/club-href'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/features/account/hooks/use-preferences', () => ({
  usePreferences: () => ({ prefs: { favorites: [], booked: [] }, failed: false }),
}))
vi.mock('@/features/account/hooks/use-record-booking-click', () => ({ useRecordBookingClick: () => vi.fn() }))
vi.mock('@/features/account/hooks/use-favorites-save-error', () => ({ useFavoritesSaveError: () => false }))
vi.mock('@/features/account/components/StarButton', () => ({ StarButton: () => null }))
vi.mock('@/features/club/components/ClubListSkeleton', () => ({
  ClubListSkeleton: () => <div data-testid="skeleton" />,
}))

import { ResultsView } from '@/features/club/components/ResultsView'

const params: SearchParams = { date: '2026-10-20', from: '10:00', to: '12:00', forMinutes: 60 }

function mk(id: string, name: string, platform: Platform): ClubResult {
  return {
    id,
    clubName: name,
    platform,
    slots: [{ from: '10:00', to: '11:00', courtName: 'K1' }],
    daySlots: [{ from: '10:00', to: '11:00', courtName: 'K1' }],
    bookingUrl: 'https://example.com',
  }
}
const alpha = mk('1', 'Alpha', Platform.Tenis4u)
const beta = mk('2', 'Beta', Platform.TwojTennis)
const sameIdA = mk('7', 'Same Tenis', Platform.Tenis4u)
const sameIdB = mk('7', 'Same Twoj', Platform.TwojTennis)

let fetchMock: ReturnType<typeof vi.fn>
function ok(body: ClubResult[]) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => body })
}
function setViewport(desktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: desktop && query === '(min-width: 1024px)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}
function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ResultsView params={params} />
    </QueryClientProvider>,
  )
}
const card = (name: string) => screen.getByRole('button', { name: new RegExp(name) })
const panelTitle = (name: string) => screen.queryByRole('heading', { level: 2, name })

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  push.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ResultsView desktop', () => {
  beforeEach(() => setViewport(true))

  it('shows the empty state, then the clicked club panel and swaps it', async () => {
    ok([alpha, beta])
    renderView()
    await screen.findByText('Alpha')
    expect(screen.getByText(/Wybierz klub z listy/)).toBeTruthy()

    fireEvent.click(card('Alpha'))
    expect(panelTitle('Alpha')).toBeTruthy()
    expect(card('Alpha').getAttribute('aria-current')).toBe('true')

    fireEvent.click(card('Beta'))
    expect(panelTitle('Beta')).toBeTruthy()
    expect(panelTitle('Alpha')).toBeNull()
    expect(card('Alpha').getAttribute('aria-current')).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })

  it('selects same id on different platforms independently', async () => {
    ok([sameIdA, sameIdB])
    renderView()
    await screen.findByText('Same Tenis')
    fireEvent.click(card('Same Twoj'))
    expect(card('Same Twoj').getAttribute('aria-current')).toBe('true')
    expect(card('Same Tenis').getAttribute('aria-current')).toBeNull()
    expect(panelTitle('Same Twoj')).toBeTruthy()
  })
})

describe('ResultsView mobile', () => {
  beforeEach(() => setViewport(false))

  it('navigates to the club page and renders no panel', async () => {
    ok([alpha, beta])
    renderView()
    await screen.findByText('Alpha')
    fireEvent.click(card('Alpha'))
    expect(push).toHaveBeenCalledWith(clubHref(alpha, params))
    expect(panelTitle('Alpha')).toBeNull()
  })
})

describe('ResultsView states', () => {
  beforeEach(() => setViewport(true))

  it('shows the empty message', async () => {
    ok([])
    renderView()
    expect(await screen.findByText('Brak dostępnych kortów w wybranym terminie.')).toBeTruthy()
  })

  it('shows the error message', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })
    renderView()
    expect(await screen.findByText('Błąd podczas wyszukiwania. Spróbuj ponownie.')).toBeTruthy()
  })

  it('shows the skeleton while loading', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderView()
    await waitFor(() => expect(screen.getByTestId('skeleton')).toBeTruthy())
  })
})

describe('ResultsView accessibility', () => {
  beforeEach(() => setViewport(true))

  it('with results has no a11y violations', async () => {
    ok([alpha, beta])
    const { container } = renderView()
    await screen.findByText('Alpha')
    await expectNoA11yViolations(container)
  })

  it('empty state has no a11y violations', async () => {
    ok([])
    const { container } = renderView()
    await screen.findByText('Brak dostępnych kortów w wybranym terminie.')
    await expectNoA11yViolations(container)
  })
})
