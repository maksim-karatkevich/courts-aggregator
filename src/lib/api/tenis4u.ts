import { cacheLife } from 'next/cache'
import { Platform } from '../types'
import type { ClubResult, SearchParams } from '../types'
import { extractSlots, type RawOccupancy } from './slot-filter'

const BASE = 'https://api.tenis4u.pl'
const FETCH_HEADERS = {
  Accept: 'application/json',
  Origin: 'https://app.tenis4u.pl',
  Referer: 'https://app.tenis4u.pl/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
  'X-Tenis-User-Agent': 'tenis4u-web-frontoffice/3.5.0',
}

// Known Kraków clubs on the tenis4u platform with their court IDs
const COURT_IDS = [
  { id: 103, clubName: 'Sport Factory Park' },
  { id: 204, clubName: 'SAO SPORTS HUB Piastowska' },
  { id: 110, clubName: 'TCC Sport Resort KORTY' },
  { id: 104, clubName: 'Fame Sport' },
  { id: 344, clubName: 'KSU Grzegórzecki' },
  { id: 218, clubName: 'Park Wola Sodowa' },
  { id: 205, clubName: 'KS Grzegórzecki - Flex Wysłouchów 34' },
]

// Full occupancy for one club (covers several days). Cached per club, so every
// search window and date reuses the same upstream response. Throws on failure
// so errors are never cached.
async function fetchOccupancy(id: number): Promise<RawOccupancy> {
  'use cache'
  cacheLife({ stale: 0, expire: 15 * 60 })

  const res = await fetch(`${BASE}/occupancy/${id}`, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`tenis4u occupancy ${id}: ${res.status}`)
  return res.json()
}

// Searches all known clubs in parallel and returns only those with available slots.
// Uses allSettled so a single failing club doesn't block the rest.
export async function searchTenis4u(params: SearchParams): Promise<ClubResult[]> {
  const results = await Promise.allSettled(
    COURT_IDS.map(async ({ id, clubName }): Promise<ClubResult | null> => {
      const slots = extractSlots(await fetchOccupancy(id), params)
      if (slots.length === 0) return null

      return {
        id: String(id),
        clubName,
        platform: Platform.Tenis4u,
        slots,
        bookingUrl: `https://app.tenis4u.pl/court/${id}`,
      }
    }),
  )

  return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
}
