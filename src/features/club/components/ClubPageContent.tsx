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

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="shrink-0 text-sm text-muted-foreground hover:text-foreground">
      ← Wyniki
    </Link>
  )
}

function Message({ children, backHref }: { children: string; backHref: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl p-3">
      <BackLink href={backHref} />
      <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
    </main>
  )
}

export function ClubPageContent() {
  const { id } = useParams<{ id: string }>()
  const sp = useSearchParams()
  const rawPlatform = sp.get('platform')
  const platform = PLATFORMS.includes(rawPlatform ?? '') ? (rawPlatform as Platform) : null

  const search = parseClubSearch(sp, format(new Date(), 'yyyy-MM-dd'))
  const params = toSearchParams(search)
  const query = useSearchResults(platform ? params : null)

  const backHref = search.window ? `/?${toQueryString(params)}` : '/'

  if (!platform) return <Message backHref="/">Nieprawidłowy link</Message>
  if (query.isLoading) return <ClubListSkeleton />
  if (query.isError) return <Message backHref={backHref}>Nie udało się wczytać terminów. Spróbuj ponownie.</Message>

  const club = query.data?.find(c => c.platform === platform && c.id === decodeClubId(id))
  if (!club) return <Message backHref={backHref}>Nie znaleziono wolnych terminów dla tego klubu</Message>

  return (
    <main className="mx-auto w-full max-w-2xl p-3">
      <CalendarPanel
        page
        club={club}
        date={search.date}
        window={search.window}
        leading={<BackLink href={backHref} />}
      />
    </main>
  )
}
