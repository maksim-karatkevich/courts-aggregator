// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Platform } from '@/lib/types'
import { useFavorites, useFavoritesSaveError } from '@/features/account/hooks'
import { flagSaveError, SAVE_ERROR_KEY, SAVE_ERROR_MS } from '@/features/account/save-error'

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { id: 'u1' } }, isPending: false }) },
}))

const club = { platform: Platform.Tenis4u, clubId: '103' }

// Preferences load fine; saving a favorite fails.
function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' || init?.method === 'DELETE'
        ? new Response(null, { status: 500 })
        : Response.json({ favorites: [], booked: [] }),
    ),
  )
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  // Two separate components, like StarButton (toggles) and ClubList (shows the banner).
  const star = renderHook(() => useFavorites(), { wrapper })
  const banner = renderHook(() => useFavoritesSaveError(), { wrapper })
  return { star, banner }
}

beforeEach(() => {
  localStorage.clear()
  stubFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('favorite save error', () => {
  it('reaches a different component than the one that toggled', async () => {
    const { star, banner } = setup()
    await waitFor(() => expect(star.result.current.ready).toBe(true))

    act(() => star.result.current.toggle(club))

    await waitFor(() => expect(banner.result.current).toBe(true))
    expect(star.result.current.isFavorite('tenis4u:103')).toBe(false) // rolled back
  })
})

describe('flagSaveError', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const isSet = (qc: QueryClient) => (qc.getQueryData(SAVE_ERROR_KEY) ?? null) !== null

  it('clears itself after the timeout', () => {
    const qc = new QueryClient()
    flagSaveError(qc)
    expect(isSet(qc)).toBe(true)
    vi.advanceTimersByTime(SAVE_ERROR_MS)
    expect(isSet(qc)).toBe(false)
  })

  it('gives a newer failure its full time', () => {
    const qc = new QueryClient()
    flagSaveError(qc)
    vi.advanceTimersByTime(SAVE_ERROR_MS - 1000)
    flagSaveError(qc)
    vi.advanceTimersByTime(1000) // the first failure's timer fires
    expect(isSet(qc)).toBe(true)
    vi.advanceTimersByTime(SAVE_ERROR_MS - 1000)
    expect(isSet(qc)).toBe(false)
  })
})
