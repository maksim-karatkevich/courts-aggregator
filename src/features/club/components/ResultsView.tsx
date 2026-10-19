'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClubResult, SearchParams } from '@/lib/types'
import { clubKey } from '@/features/account/model/club-key'
import { CalendarEmptyState } from '@/features/calendar/components/CalendarEmptyState'
import { CalendarPanel } from '@/features/calendar/components/CalendarPanel'
import { useSearchResults } from '@/features/search/hooks/use-search-results'
import { useMediaQuery } from '@/hooks/use-media-query'
import { clubHref } from '../club-href'
import { ClubList } from './ClubList'
import { ClubListSkeleton } from './ClubListSkeleton'

const keyOf = (c: ClubResult) => clubKey({ platform: c.platform, clubId: c.id })

function Message({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function ResultsView({ params }: { params: SearchParams }) {
  const router = useRouter()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const query = useSearchResults(params)

  if (query.isLoading) return <ClubListSkeleton />
  if (query.isError) return <Message>Błąd podczas wyszukiwania. Spróbuj ponownie.</Message>
  const clubs = query.data ?? []
  if (!clubs.length) return <Message>Brak dostępnych kortów w wybranym terminie.</Message>

  const selected = clubs.find((c) => keyOf(c) === selectedKey) ?? null

  function open(club: ClubResult) {
    if (isDesktop) setSelectedKey(keyOf(club))
    else router.push(clubHref(club, params))
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:h-full lg:grid-cols-[300px_1fr]">
      <div className="min-h-0 lg:overflow-y-auto">
        <ClubList clubs={clubs} selectedKey={selectedKey} onOpen={open} />
      </div>
      <div className="hidden min-h-0 lg:block lg:overflow-y-auto">
        {selected ? (
          <CalendarPanel
            key={keyOf(selected)}
            club={selected}
            date={params.date}
            window={{ from: params.from, to: params.to }}
          />
        ) : (
          <CalendarEmptyState />
        )}
      </div>
    </div>
  )
}
