// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchResults } from '@/features/search/hooks/use-search-results'

const params = { date: '2026-10-20', from: '18:00', to: '21:00', forMinutes: 90 }

function setup(p: typeof params | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  return renderHook(() => useSearchResults(p), { wrapper })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useSearchResults', () => {
  it('never fetches without params', () => {
    setup(null)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches once with the query string and returns the JSON', async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: 'a' }]))
    const { result } = setup(params)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/search?date=2026-10-20&from=18%3A00&to=21%3A00&forMinutes=90')
    expect(result.current.data).toEqual([{ id: 'a' }])
  })

  it('goes to the error state on a non-OK response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }))
    const { result } = setup(params)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('Search failed: 500')
  })
})
