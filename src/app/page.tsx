import { Suspense } from 'react'
import { SearchPage } from '@/features/search/components/SearchPage'

export default function HomePage() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  )
}
