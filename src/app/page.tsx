'use client'

import { Suspense, useCallback, useState } from 'react'
import { SearchForm } from '@/features/search/components/SearchForm'
import type { ClubResult, SearchParams } from '@/lib/types'
import { ClubList } from '@/features/club/components/ClubList'
import { ClubListSkeleton } from '@/features/club/components/ClubListSkeleton'
import { ErrorBoundary } from '@/components/error-boundary'
import { AccountButton } from '@/features/account/components/AccountButton'
const MIN_TIME_PERIOD = 60;


export default function HomePage() {
  const [clubs, setClubs] = useState<Promise<ClubResult[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const search = useCallback(async (params: Omit<SearchParams, 'forMinutes'>) => {
    setLoading(true);
    const query = new URLSearchParams({ ...params, forMinutes: String(MIN_TIME_PERIOD) });
    const searchResult = fetch(`/api/search?${query}`)
      .then(r => {
        if (!r.ok) throw new Error(`Search failed: ${r.status}`);
        return r.json() as Promise<ClubResult[]>;
      })
      .finally(() => setLoading(false));
    setClubs(searchResult);
}, []);

return (
  <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
    <header className="flex w-full max-w-[760px] items-start justify-between gap-4">
      <div className="flex-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Korty Kraków</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dostępność kortów tenisowych w jednym miejscu</p>
      </div>
      <AccountButton />
    </header>
    <SearchForm loading={loading} onSearch={search} />
    {clubs && (
      <Suspense fallback={<ClubListSkeleton />}>
        <ErrorBoundary fallback={<p>Błąd podczas wyszukiwania. Spróbuj ponownie.</p>}>
          <ClubList clubsPromise={clubs} />
        </ErrorBoundary>
      </Suspense>
    )}
  </main>
)
}
