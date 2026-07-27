'use client'

import { Suspense, useCallback, useState } from 'react'
import { SearchForm } from '@/features/search/components/SearchForm'
import { searchTenis4u } from '@/lib/api/tenis4u'
import { searchTwojTennis } from '@/lib/api/twojtennis'
import type { ClubResult } from '@/lib/types'
import { ClubList, ClubListSkeleton } from '@/features/club/components/ClubList'

export default function HomePage() {
  const [clubs, setClubs] = useState<Promise<ClubResult[]> | null>(null);

  const search = useCallback((params: any) => {
    setClubs(
      Promise.all([
        searchTenis4u({ ...params, forMinutes: 60 }),
        searchTwojTennis({ ...params, forMinutes: 60 }),
      ]).then(([a, b]) => [...a, ...b])
    )
  }, []);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Korty Kraków</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dostępność kortów tenisowych w jednym miejscu</p>
      </div>
      <SearchForm onSearch={search} />
      {clubs && (
        <Suspense fallback={<ClubListSkeleton />}>
          <ClubList clubsPromise={clubs} />
        </Suspense>
      )}
    </main>
  )
}
