import type { Platform, SearchParams } from '@/lib/types'
import { toQueryString } from '@/features/search/model/search-url'

export function clubHref(club: { platform: Platform; id: string }, p: SearchParams): string {
  const query = `platform=${club.platform}&${toQueryString(p)}`
  return `/club/${encodeURIComponent(club.id)}?${query}`
}

// useParams may hand back the still-percent-encoded segment; decode exactly once.
export function decodeClubId(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
