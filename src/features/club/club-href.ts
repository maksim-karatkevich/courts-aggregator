import type { Platform, SearchParams } from '@/lib/types'
import { toQueryString } from '@/features/search/model/search-url'

export function clubHref(club: { platform: Platform; id: string }, p: SearchParams): string {
  const query = `platform=${club.platform}&${toQueryString(p)}`
  return `/club/${encodeURIComponent(club.id)}?${query}`
}
