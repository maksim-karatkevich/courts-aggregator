'use client'

import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SearchParams } from '@/lib/types'
import { ResultsView } from '@/features/club/components/ResultsView'
import { parseSearchParams, toQueryString } from '../model/search-url'
import { SearchForm } from './SearchForm'

// Rendered inside the page <main> (see app/page.tsx), which owns the flex layout.
export function SearchPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const sp = useSearchParams()
  const params = parseSearchParams(sp)
  const loading = useIsFetching({ queryKey: ['search'] }) > 0

  function search(p: SearchParams) {
    const qs = toQueryString(p)
    if (params && qs === toQueryString(params)) {
      // Same URL: replace() would be a no-op, so refresh the live availability instead.
      queryClient.invalidateQueries({ queryKey: ['search', p.date, p.from, p.to, p.forMinutes] })
      return
    }
    router.replace('/?' + qs)
  }

  return (
    <>
      <SearchForm onSearch={search} initial={params ?? undefined} loading={loading} />
      <div className="min-h-0 flex-1">
        {params && <ResultsView key={toQueryString(params)} params={params} />}
      </div>
    </>
  )
}
