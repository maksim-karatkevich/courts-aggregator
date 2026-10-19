import { cacheLife } from 'next/cache'
import { Platform } from '../types'
import type { ClubResult, SearchParams } from '../types'
import { filterTwojTennisDaySlots, filterTwojTennisSlots, type LocationInfo, type RawFreeSlot } from './slot-filter'

const TWOJTENNIS_BASE = 'https://app-twojtenis-api-p-weu.azurewebsites.net'
const TECH_GROUP_URL = 'https://app-twojtenis-tech-krakow-api-p-weu.azurewebsites.net'
const CLUB_DETAIL_URL = `${TWOJTENNIS_BASE}/api/v1/Clubs`
const CLUBS_SEARCH_URL = `${TWOJTENNIS_BASE}/api/v1/Clubs/search`
const FREESLOTS_URL = `${TECH_GROUP_URL}/api/v1/freeslots/search`
const REGION_ID = '31e247b1-1682-4e58-ba05-1bba6ca9ed23'
const LOCATION_TYPE = 0
const TIMEOUT_MS = 10_000

const HEADERS = {
  Accept: 'application/json',
  Origin: 'https://app.twojtenis.pl',
  Referer: 'https://app.twojtenis.pl/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
}

// ─── Raw API shapes ────────────────────────────────────────────────────────

type RawClub = {
  id: string
  name: string
  isFavorite: boolean
  locations?: { id: string; from: string; to: string }[]
}

type RawClubsResponse = { clubs?: RawClub[] }[]

type RawLocationDetail = {
  locations?: {
    id: string
    name: string
    properties?: { SurfaceType?: string; TennisCourtType?: string }
  }[]
}

type RawFreeslotsResponse = {
  clubs?: {
    id: string
    name?: string
    containsEmptySlots: boolean
    spans?: Record<string, RawFreeSlot[]>
  }[]
}

// ─── Cached fetchers ───────────────────────────────────────────────────────
// Each fetcher throws on a bad response so failures are never cached.

async function fetchClubs(date: string): Promise<RawClub[]> {
  'use cache'
  cacheLife({ stale: 0, expire: 24 * 60 * 60 })

  const res = await fetch(CLUBS_SEARCH_URL, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, forMinutes: 60, from: '00:00:00', to: '23:00:00', locationType: LOCATION_TYPE, regionId: REGION_ID }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`twojtennis clubs: ${res.status}`)
  const [group]: RawClubsResponse = await res.json()
  return group?.clubs ?? []
}

async function fetchLocationMap(clubIds: string[]): Promise<Record<string, LocationInfo>> {
  'use cache'
  cacheLife({ stale: 0, expire: 24 * 60 * 60 })

  const details = await Promise.all(
    clubIds.map(id =>
      fetch(`${CLUB_DETAIL_URL}/${id}`, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) })
        .then(r => r.ok ? r.json() as Promise<RawLocationDetail> : { locations: [] })
        .catch(() => ({ locations: [] as [] }))
    )
  )

  const map: Record<string, LocationInfo> = {}
  for (const detail of details as RawLocationDetail[]) {
    for (const loc of detail.locations ?? []) {
      map[loc.id] = {
        name: loc.name,
        surfaceType: loc.properties?.SurfaceType,
        courtType: loc.properties?.TennisCourtType,
      }
    }
  }
  return map
}

// Full-day free slots for every club, cached per date. Filtering by the user's
// window and duration happens afterwards, outside the cache.
async function fetchFreeSlots(date: string): Promise<RawFreeslotsResponse> {
  'use cache'
  cacheLife({ stale: 0, expire: 15 * 60 })

  const clubs = await fetchClubs(date)
  const res = await fetch(FREESLOTS_URL, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clubs, date, forMinutes: 60, locationType: LOCATION_TYPE, technicalGroupUrl: TECH_GROUP_URL }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`twojtennis freeslots: ${res.status}`)
  const raw = await res.json()
  return Array.isArray(raw) ? raw[0] : raw
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function searchTwojTennis(params: SearchParams): Promise<ClubResult[]> {
  const clubs = await fetchClubs(params.date)
  const [freeslots, locationMap] = await Promise.all([
    fetchFreeSlots(params.date),
    fetchLocationMap(clubs.map(c => c.id)),
  ])

  const results: ClubResult[] = []

  for (const club of freeslots?.clubs ?? []) {
    if (!club.containsEmptySlots) continue

    const slots = filterTwojTennisSlots(club.spans ?? {}, locationMap, params)
    if (slots.length === 0) continue

    results.push({
      id: club.id,
      clubName: club.name ?? 'Nieznany klub',
      platform: Platform.TwojTennis,
      slots,
      daySlots: filterTwojTennisDaySlots(club.spans ?? {}, locationMap),
      bookingUrl: `https://app.twojtenis.pl/#/clubs/${club.id}?tab=bookings`,
    })
  }

  return results
}
