'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Platform } from '@/lib/types'
import { CalendarPanel } from '@/features/calendar/components/CalendarPanel'
import { useSearchResults } from '@/features/search/hooks/use-search-results'
import { parseClubSearch, toQueryString, toSearchParams } from '@/features/search/model/search-url'
import { ClubListSkeleton } from './ClubListSkeleton'
import { decodeClubId } from '../club-href'

const PLATFORMS: readonly string[] = Object.values(Platform)

function Message({ children }: { children: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
}

export function ClubPageContent() {
  const { id } = useParams<{ id: string }>()
  const sp = useSearchParams()
  const rawPlatform = sp.get('platform')
  const platform = PLATFORMS.includes(rawPlatform ?? '') ? (rawPlatform as Platform) : null

  const search = parseClubSearch(sp, format(new Date(), 'yyyy-MM-dd'))
  const params = toSearchParams(search)
  const query = useSearchResults(platform ? params : null)

  if (!platform) return <Message>Nieprawidłowy link</Message>
  if (query.isLoading) return <ClubListSkeleton />
  if (query.isError) return <Message>Nie udało się wczytać terminów. Spróbuj ponownie.</Message>

  const club = query.data?.find(c => c.platform === platform && c.id === decodeClubId(id))
  if (!club) return <Message>Nie znaleziono wolnych terminów dla tego klubu</Message>

  const backHref = search.window ? `/?${toQueryString(params)}` : '/'
  return (
    <main className="mx-auto w-full max-w-2xl p-3">
      <CalendarPanel
        club={club}
        date={search.date}
        window={search.window}
        leading={
          <Link href={backHref} className="shrink-0 text-sm text-muted-foreground hover:text-foreground">
            ← Wyniki
          </Link>
        }
      />
    </main>
  )
}
