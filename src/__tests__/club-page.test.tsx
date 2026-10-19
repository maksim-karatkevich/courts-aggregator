// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Platform, type ClubResult } from '@/lib/types'

let search = ''
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c1' }),
  useSearchParams: () => new URLSearchParams(search),
}))

const panelProps = vi.fn()
vi.mock('@/features/calendar/components/CalendarPanel', () => ({
  CalendarPanel: (props: { club: ClubResult; leading?: ReactNode }) => {
    panelProps(props)
    return (
      <div>
        <span>{props.club.clubName}</span>
        {props.leading}
      </div>
    )
  },
}))

import { ClubPageContent } from '@/features/club/components/ClubPageContent'

const club: ClubResult = {
  id: 'c1',
  clubName: 'Klub Testowy',
  platform: Platform.Tenis4u,
  slots: [],
  daySlots: [],
  bookingUrl: 'https://example.com',
}

let fetchMock: ReturnType<typeof vi.fn>

function ok(body: ClubResult[]) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => body })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ClubPageContent />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  panelProps.mockClear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ClubPageContent', () => {
  it('renders the club and passes the URL window to the panel', async () => {
    search = 'platform=tenis4u&date=2026-10-20&from=18:00&to=21:00&forMinutes=90'
    ok([{ ...club, id: 'other', clubName: 'Inny' }, club])
    renderPage()
    expect(await screen.findByText('Klub Testowy')).toBeTruthy()
    const props = panelProps.mock.calls[0][0]
    expect(props.window).toEqual({ from: '18:00', to: '21:00' })
    expect(props.date).toBe('2026-10-20')
  })

  it('defaults the fetch window and passes window null when none in URL', async () => {
    search = 'platform=tenis4u&date=2026-10-20'
    ok([club])
    renderPage()
    await screen.findByText('Klub Testowy')
    expect(fetchMock.mock.calls[0][0]).toContain('from=07%3A00&to=23%3A00')
    expect(panelProps.mock.calls[0][0].window).toBeNull()
  })

  it('treats garbage from/to like no window', async () => {
    search = 'platform=tenis4u&date=2026-10-20&from=99:99&to=abc'
    ok([club])
    renderPage()
    await screen.findByText('Klub Testowy')
    expect(panelProps.mock.calls[0][0].window).toBeNull()
  })

  it('shows a message when the club is not in the response', async () => {
    search = 'platform=tenis4u&date=2026-10-20'
    ok([{ ...club, id: 'other' }])
    renderPage()
    expect(await screen.findByText('Nie znaleziono wolnych terminów dla tego klubu')).toBeTruthy()
  })

  it.each(['', 'platform=bogus&date=2026-10-20'])('rejects bad platform (%s) without fetching', async q => {
    search = q
    renderPage()
    expect(await screen.findByText('Nieprawidłowy link')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows an error message when fetch fails', async () => {
    search = 'platform=tenis4u&date=2026-10-20'
    fetchMock.mockResolvedValue({ ok: false, status: 500 })
    renderPage()
    expect(await screen.findByText('Nie udało się wczytać terminów. Spróbuj ponownie.')).toBeTruthy()
  })

  it('back link keeps the window when present', async () => {
    search = 'platform=tenis4u&date=2026-10-20&from=18:00&to=21:00&forMinutes=90'
    ok([club])
    renderPage()
    const link = await screen.findByText('← Wyniki')
    expect(link.closest('a')?.getAttribute('href')).toBe(
      '/?date=2026-10-20&from=18%3A00&to=21%3A00&forMinutes=90',
    )
  })

  it('back link goes to / without a window', async () => {
    search = 'platform=tenis4u&date=2026-10-20'
    ok([club])
    renderPage()
    const link = await screen.findByText('← Wyniki')
    await waitFor(() => expect(link.closest('a')?.getAttribute('href')).toBe('/'))
  })
})
