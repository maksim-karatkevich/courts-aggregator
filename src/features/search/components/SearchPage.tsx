'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { SearchParams } from '@/lib/types'
import { AccountButton } from '@/features/account/components/AccountButton'
import { ResultsView } from '@/features/club/components/ResultsView'
import { parseSearchParams, toQueryString } from '../model/search-url'
import { SearchForm } from './SearchForm'

export function SearchPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const params = parseSearchParams(sp)

  function search(p: SearchParams) {
    router.replace('/?' + toQueryString(p))
  }

  return (
    <main className="flex min-h-svh flex-col gap-4 p-4 lg:h-svh lg:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Korty Kraków</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dostępność kortów tenisowych w jednym miejscu</p>
        </div>
        <AccountButton />
      </header>
      <SearchForm onSearch={search} initial={params ?? undefined} />
      <div className="min-h-0 flex-1">
        {params && <ResultsView key={toQueryString(params)} params={params} />}
      </div>
    </main>
  )
}
