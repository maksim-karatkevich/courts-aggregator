import { Suspense } from 'react'
import { PageHeader } from '@/features/search/components/PageHeader'
import { SearchFormSkeleton } from '@/features/search/components/SearchFormSkeleton'
import { SearchPage } from '@/features/search/components/SearchPage'

export default function HomePage() {
  // The header is static, so only the part that reads useSearchParams suspends.
  return (
    <main className="flex min-h-svh flex-col gap-4 p-4 lg:h-svh lg:p-6">
      <PageHeader />
      <Suspense fallback={<SearchFormSkeleton />}>
        <SearchPage />
      </Suspense>
    </main>
  )
}
