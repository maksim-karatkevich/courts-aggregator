import type { ClubResult, SearchParams, TimeSlot } from '../types'

const TECH_GROUP_URL = 'https://app-twojtenis-tech-krakow-api-p-weu.azurewebsites.net'
const CLUB_DETAIL_URL = '/api/twojtennis/api/v1/Clubs'
const CLUBS_SEARCH_URL = '/api/twojtennis/api/v1/Clubs/search'
const FREESLOTS_URL = '/api/twojtennis-tech/api/v1/freeslots/search'
const REGION_ID = '31e247b1-1682-4e58-ba05-1bba6ca9ed23' // Kraków
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days

// Club entry as returned by Clubs/search — has location IDs + closing times
type GroupClub = {
  id: string
  name: string
  isFavorite: boolean
  locations: { id: string; from: string; to: string }[]
}

// Court detail from Clubs/{id}
type ClubLocation = {
  id: string
  name: string
  type: number
  surfaceType: string
  courtType: string
}

// ─── Group cache (club list + location IDs) ────────────────────────────────
// Only ever written from Clubs/search so location arrays are never empty.

let memGroup: GroupClub[] | null = null

const GROUP_CACHE_KEY = 'twojtennis_group_v2'

function readGroupLs(): GroupClub[] | null {
  try {
    const raw = localStorage.getItem(GROUP_CACHE_KEY)
    if (!raw) return null
    const { clubs, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt >= CACHE_TTL) return null
    const valid = clubs.filter((c: GroupClub) => c.locations.length > 0)
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

function writeGroupLs(clubs: GroupClub[]) {
  try {
    localStorage.setItem(GROUP_CACHE_KEY, JSON.stringify({ clubs, savedAt: Date.now() }))
  } catch {}
}

async function getGroup(from: string): Promise<GroupClub[]> {
  const cached = memGroup ?? readGroupLs()
  if (cached) return cached

  // Cold cache — call Clubs/search once to discover clubs + location IDs
  const resp = await fetch(CLUBS_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      forMinutes: 60,
      from: `${from}:00`,
      to: '23:00:00',
      locationType: 0,
      regionId: REGION_ID,
    }),
  })
  if (!resp.ok) throw new Error(`TwojTenis Clubs/search failed: ${resp.status}`)
  const [group] = await resp.json()

  const clubs: GroupClub[] = (group.clubs ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    isFavorite: c.isFavorite,
    locations: c.locations ?? [],
  })).filter((c: GroupClub) => c.locations.length > 0)

  memGroup = clubs
  writeGroupLs(clubs)
  return clubs
}

// ─── Club detail cache (court names + surface) ─────────────────────────────

const memDetails = new Map<string, ClubLocation[]>()

function readDetailLs(clubId: string): ClubLocation[] | null {
  try {
    const raw = localStorage.getItem(`twojtennis_club_${clubId}`)
    if (!raw) return null
    const { locations, savedAt } = JSON.parse(raw)
    return Date.now() - savedAt < CACHE_TTL ? locations : null
  } catch {
    return null
  }
}

function writeDetailLs(clubId: string, locations: ClubLocation[]) {
  try {
    localStorage.setItem(`twojtennis_club_${clubId}`, JSON.stringify({ locations, savedAt: Date.now() }))
  } catch {}
}

async function fetchClubDetail(clubId: string): Promise<ClubLocation[]> {
  if (memDetails.has(clubId)) return memDetails.get(clubId)!

  const fromLs = readDetailLs(clubId)
  if (fromLs) {
    memDetails.set(clubId, fromLs)
    return fromLs
  }

  const resp = await fetch(`${CLUB_DETAIL_URL}/${clubId}`, { headers: { Accept: 'application/json' } })
  if (!resp.ok) return []

  const data = await resp.json()
  const locations: ClubLocation[] = (data.locations ?? []).map((l: any) => ({
    id: l.id,
    name: l.name as string,
    type: l.type as number,
    surfaceType: l.properties?.SurfaceType ?? '',
    courtType: l.properties?.TennisCourtType ?? '',
  }))

  memDetails.set(clubId, locations)
  writeDetailLs(clubId, locations)
  return locations
}

async function buildLocationMap(clubIds: string[]): Promise<Map<string, ClubLocation>> {
  const details = await Promise.all(clubIds.map(fetchClubDetail))
  const map = new Map<string, ClubLocation>()
  for (const locations of details) {
    for (const loc of locations) map.set(loc.id, loc)
  }
  return map
}

// ─── Core search ───────────────────────────────────────────────────────────

export async function searchTwojTennis(params: SearchParams): Promise<ClubResult[]> {
  // Step 1: get club list (Clubs/search — cold cache only)
  const group = await getGroup(params.from)

  // Step 2: freeslots/search + Clubs/{id} detail fetches in parallel
  const freeslotsBody = {
    technicalGroupUrl: TECH_GROUP_URL,
    locationType: 0,
    date: params.date,
    forMinutes: params.forMinutes,
    clubs: group.map(c => ({
      id: c.id,
      name: c.name,
      isFavorite: c.isFavorite,
      locations: c.locations.map(l => ({
        id: l.id,
        from: `${params.from}:00`,
        to: l.to,
      })),
    })),
  }

  const [freeslotsResp, locationMap] = await Promise.all([
    fetch(FREESLOTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(freeslotsBody),
    }),
    buildLocationMap(group.map(c => c.id)),
  ])

  if (!freeslotsResp.ok) throw new Error(`TwojTenis freeslots failed: ${freeslotsResp.status}`)
  const raw = await freeslotsResp.json()
  const data = Array.isArray(raw) ? raw[0] : raw

  // Step 3: normalize — only clubs with actual free spans
  const clubs: any[] = data?.clubs ?? []
  const results: ClubResult[] = []

  for (const club of clubs) {
    if (!club.containsEmptySlots) continue

    const slots: TimeSlot[] = []
    const spans: Record<string, { from: string; to: string }[]> = club.spans ?? {}

    for (const [locId, locSlots] of Object.entries(spans)) {
      const detail = locationMap.get(locId)
      for (const s of locSlots) {
        const from = s.from.slice(0, 5)
        const to = s.to.slice(0, 5)
        if (from && to) slots.push({
          from,
          to,
          courtName: detail?.name,
          surfaceType: detail?.surfaceType,
          courtType: detail?.courtType,
        })
      }
    }

    if (slots.length === 0) continue

    results.push({
      id: club.id,
      clubName: club.name ?? 'Nieznany klub',
      platform: 'twojtennis',
      slots,
      bookingUrl: `https://app.twojtenis.pl/#/clubs/${club.id}?tab=bookings`,
    })
  }

  return results
}