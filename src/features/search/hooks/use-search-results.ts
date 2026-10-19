import { useQuery } from '@tanstack/react-query'
import type { ClubResult, SearchParams } from '@/lib/types'
import { toQueryString } from '../model/search-url'

async function fetchSearch(params: SearchParams): Promise<ClubResult[]> {
  const res = await fetch(`/api/search?${toQueryString(params)}`)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  return res.json()
}

export function useSearchResults(params: SearchParams | null) {
  return useQuery({
    queryKey: ['search', params?.date, params?.from, params?.to, params?.forMinutes],
    queryFn: () => fetchSearch(params as SearchParams),
    enabled: params !== null,
  })
}
