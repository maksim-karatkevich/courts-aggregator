# Server-Side Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move court availability fetching server-side, cache full-day data with `'use cache'`, and filter by the user's time window locally.

**Architecture:** A new `GET /api/search` Route Handler receives search params from the browser, calls server-side cached fetchers for tenis4u and twojtennis in parallel, filters results locally, and returns `ClubResult[]`. tenis4u occupancy is cached per `(courtId, date)` for 30 min; twojtennis freeslots are cached per `date` for 30 min; twojtennis club metadata is cached for 30 days. All CORS proxy routes are deleted — server-to-server calls have no CORS restrictions.

**Tech Stack:** Next.js 16, TypeScript, `'use cache'` directive, `cacheLife`/`cacheTag` from `next/cache`, Vitest for unit tests.

## Global Constraints

- `'use cache'` and `cacheLife`/`cacheTag` require Next.js 16 server-side context (Route Handlers, Server Components, Server Actions). Never call these from client components.
- All upstream fetches must include `AbortSignal.timeout(10_000)` — existing proxy routes omitted this.
- Upstream headers for tenis4u: `Origin: https://app.tenis4u.pl`, `Referer: https://app.tenis4u.pl/`, `User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36`, `X-Tenis-User-Agent: tenis4u-web-frontoffice/3.5.0`.
- Upstream headers for twojtennis: `Origin: https://app.twojtenis.pl`, `Referer: https://app.twojtenis.pl/`, same `User-Agent`.
- tenis4u upstream base: `https://api.tenis4u.pl`
- twojtennis clubs upstream base: `https://app-twojtenis-api-p-weu.azurewebsites.net`
- twojtennis freeslots upstream base: `https://app-twojtenis-tech-krakow-api-p-weu.azurewebsites.net`
- twojtennis region ID: `31e247b1-1682-4e58-ba05-1bba6ca9ed23`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/api/slot-filter.ts` | Pure filtering functions + raw types. No Next.js imports — fully testable. |
| Create | `src/lib/api/tenis4u.server.ts` | `fetchTenis4uOccupancy` (`'use cache'`), `searchTenis4u` |
| Create | `src/lib/api/twojtennis.server.ts` | Cached fetchers for group/detail/freeslots, `searchTwojTennis` |
| Create | `src/app/api/search/route.ts` | GET handler: parse params, call both search fns, return JSON |
| Create | `src/__tests__/slot-filter.test.ts` | Unit tests for `extractSlots` and `filterTwojTennisSlots` |
| Create | `vitest.config.ts` | Vitest config with `@` alias |
| Modify | `next.config.ts` | Add `experimental: { dynamicIO: true }` if needed |
| Modify | `package.json` | Add `vitest` to devDependencies and `test` script |
| Modify | `src/app/page.tsx` | Replace direct API calls with `fetch('/api/search?...')` |
| Delete | `src/app/api/tenis4u/[...path]/route.ts` | CORS proxy, no longer needed |
| Delete | `src/app/api/twojtennis/[...path]/route.ts` | CORS proxy, no longer needed |
| Delete | `src/app/api/twojtennis-tech/[...path]/route.ts` | CORS proxy, no longer needed |
| Delete | `src/lib/api/tenis4u.ts` | Client-side version replaced by server module |
| Delete | `src/lib/api/twojtennis.ts` | Client-side version replaced by server module |

---

## Task 1: Bootstrap Vitest and verify `'use cache'`

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `npm test` command that runs the test suite; `'use cache'` available in server files.

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

Expected: vitest appears in `package.json` devDependencies.

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add `"test": "vitest run"` to the `scripts` section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] **Step 3: Create vitest.config.ts**

Create `vitest.config.ts` at the project root:

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Check if `dynamicIO` is needed**

Run:
```bash
npm run build 2>&1 | head -30
```

If the build succeeds without it, skip the next step. If you see an error mentioning `'use cache'` or `dynamicIO`, proceed to Step 5.

- [ ] **Step 5: Enable dynamicIO (only if Step 4 failed)**

Rewrite `next.config.ts`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    dynamicIO: true,
  },
}

export default nextConfig
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts next.config.ts
git commit -m "chore: add vitest and enable dynamicIO for use cache"
```

---

## Task 2: Pure filtering functions (TDD)

**Files:**
- Create: `src/lib/api/slot-filter.ts`
- Create: `src/__tests__/slot-filter.test.ts`

**Interfaces:**
- Produces:
  - `extractSlots(occupancy: RawOccupancy, params: SearchParams): TimeSlot[]`
  - `filterTwojTennisSlots(spans: Record<string, RawFreeSlot[]>, locationMap: Map<string, ClubLocation>, params: SearchParams): TimeSlot[]`
  - Exported types: `RawOccupancy`, `RawFreeHour`, `RawDay`, `RawStation`, `RawFreeSlot`, `ClubLocation`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/slot-filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { extractSlots, filterTwojTennisSlots } from '../lib/api/slot-filter'
import type { RawOccupancy, RawFreeSlot, ClubLocation } from '../lib/api/slot-filter'

const baseParams = {
  date: '2026-07-30',
  from: '09:00',
  to: '12:00',
  forMinutes: 60,
}

describe('extractSlots', () => {
  it('clips a free slot to the requested window', () => {
    const occupancy: RawOccupancy = {
      stations: [{
        name: 'Kort 1',
        days: [{ date: '2026/07/30', free_hours: [{ begin_time: '08:00:00', end_time: '13:00:00' }] }],
      }],
    }
    expect(extractSlots(occupancy, baseParams)).toEqual([
      { from: '09:00', to: '12:00', courtName: 'Kort 1' },
    ])
  })

  it('drops a slot shorter than forMinutes after clipping', () => {
    const occupancy: RawOccupancy = {
      stations: [{
        name: 'Kort 1',
        days: [{ date: '2026/07/30', free_hours: [{ begin_time: '11:30:00', end_time: '12:00:00' }] }],
      }],
    }
    expect(extractSlots(occupancy, baseParams)).toHaveLength(0)
  })

  it('ignores slots on a different date', () => {
    const occupancy: RawOccupancy = {
      stations: [{
        name: 'Kort 1',
        days: [{ date: '2026/07/31', free_hours: [{ begin_time: '09:00:00', end_time: '12:00:00' }] }],
      }],
    }
    expect(extractSlots(occupancy, baseParams)).toHaveLength(0)
  })

  it('handles missing stations gracefully', () => {
    expect(extractSlots({}, baseParams)).toEqual([])
  })
})

describe('filterTwojTennisSlots', () => {
  const loc: ClubLocation = { id: 'loc1', name: 'Kort A', type: 0, surfaceType: 'Clay', courtType: 'Indoor' }
  const locationMap = new Map([['loc1', loc]])

  it('clips a free span to the requested window', () => {
    const spans: Record<string, RawFreeSlot[]> = {
      loc1: [{ from: '08:00:00', to: '13:00:00' }],
    }
    expect(filterTwojTennisSlots(spans, locationMap, baseParams)).toEqual([
      { from: '09:00', to: '12:00', courtName: 'Kort A', surfaceType: 'Clay', courtType: 'Indoor' },
    ])
  })

  it('drops a span shorter than forMinutes after clipping', () => {
    const spans: Record<string, RawFreeSlot[]> = {
      loc1: [{ from: '11:30:00', to: '12:00:00' }],
    }
    expect(filterTwojTennisSlots(spans, locationMap, baseParams)).toHaveLength(0)
  })

  it('returns undefined court details when locationId not in map', () => {
    const spans: Record<string, RawFreeSlot[]> = {
      'unknown': [{ from: '09:00:00', to: '12:00:00' }],
    }
    const slots = filterTwojTennisSlots(spans, new Map(), baseParams)
    expect(slots[0].courtName).toBeUndefined()
    expect(slots[0].surfaceType).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../lib/api/slot-filter'`

- [ ] **Step 3: Implement slot-filter.ts**

Create `src/lib/api/slot-filter.ts`:

```ts
import type { SearchParams, TimeSlot } from '../types'

export type RawFreeHour = { begin_time?: string; end_time?: string }
export type RawDay = { date?: string; free_hours?: RawFreeHour[] }
export type RawStation = { id?: number; name?: string; type?: string; days?: RawDay[] }
export type RawOccupancy = { stations?: RawStation[] }

export type RawFreeSlot = { from: string; to: string }
export type ClubLocation = {
  id: string
  name: string
  type: number
  surfaceType: string
  courtType: string
}

export function toHHMM(timeStr: string): string {
  return timeStr?.slice(0, 5) ?? ''
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export function extractSlots(occupancy: RawOccupancy, params: SearchParams): TimeSlot[] {
  const fromMin = timeToMinutes(params.from)
  const toMin = timeToMinutes(params.to)
  const targetDate = params.date.replace(/-/g, '/')
  const slots: TimeSlot[] = []

  for (const station of occupancy.stations ?? []) {
    const day = (station.days ?? []).find((d) => d.date === targetDate)
    for (const slot of day?.free_hours ?? []) {
      const from = toHHMM(slot.begin_time ?? '')
      const to = toHHMM(slot.end_time ?? '')
      if (!from || !to) continue
      const effectiveFrom = Math.max(timeToMinutes(from), fromMin)
      const effectiveTo = Math.min(timeToMinutes(to), toMin)
      if (effectiveTo - effectiveFrom >= (params.forMinutes ?? 60)) {
        slots.push({
          from: minutesToHHMM(effectiveFrom),
          to: minutesToHHMM(effectiveTo),
          courtName: station.name ?? undefined,
        })
      }
    }
  }

  return slots
}

export function filterTwojTennisSlots(
  spans: Record<string, RawFreeSlot[]>,
  locationMap: Map<string, ClubLocation>,
  params: SearchParams,
): TimeSlot[] {
  const fromMin = timeToMinutes(params.from)
  const toMin = timeToMinutes(params.to)
  const slots: TimeSlot[] = []

  for (const [locId, locSlots] of Object.entries(spans)) {
    const detail = locationMap.get(locId)
    for (const s of locSlots) {
      const slotFrom = toHHMM(s.from)
      const slotTo = toHHMM(s.to)
      if (!slotFrom || !slotTo) continue
      const effectiveFrom = Math.max(timeToMinutes(slotFrom), fromMin)
      const effectiveTo = Math.min(timeToMinutes(slotTo), toMin)
      if (effectiveTo - effectiveFrom >= (params.forMinutes ?? 60)) {
        slots.push({
          from: minutesToHHMM(effectiveFrom),
          to: minutesToHHMM(effectiveTo),
          courtName: detail?.name,
          surfaceType: detail?.surfaceType,
          courtType: detail?.courtType,
        })
      }
    }
  }

  return slots
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/slot-filter.ts src/__tests__/slot-filter.test.ts
git commit -m "feat: add pure slot filtering functions with tests"
```

---

## Task 3: tenis4u server module

**Files:**
- Create: `src/lib/api/tenis4u.server.ts`

**Interfaces:**
- Consumes: `extractSlots`, `RawOccupancy` from `./slot-filter`; `SearchParams`, `ClubResult`, `Platform` from `../types`
- Produces: `export async function searchTenis4u(params: SearchParams): Promise<ClubResult[]>`

- [ ] **Step 1: Create tenis4u.server.ts**

Create `src/lib/api/tenis4u.server.ts`:

```ts
import { cacheLife, cacheTag } from 'next/cache'
import { Platform } from '../types'
import type { ClubResult, SearchParams } from '../types'
import { extractSlots } from './slot-filter'
import type { RawOccupancy } from './slot-filter'

const UPSTREAM = 'https://api.tenis4u.pl'
const ORIGIN = 'https://app.tenis4u.pl'

const TENIS4U_HEADERS = {
  Accept: 'application/json',
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
  'X-Tenis-User-Agent': 'tenis4u-web-frontoffice/3.5.0',
}

const COURT_IDS = [
  { id: 103, clubName: 'Sport Factory Park' },
  { id: 204, clubName: 'SAO SPORTS HUB Piastowska' },
  { id: 110, clubName: 'TCC Sport Resort KORTY' },
  { id: 104, clubName: 'Fame Sport' },
  { id: 344, clubName: 'KSU Grzegórzecki' },
  { id: 218, clubName: 'Park Wola Sodowa' },
  { id: 205, clubName: 'KS Grzegórzecki - Flex Wysłouchów 34' },
]

async function fetchTenis4uOccupancy(courtId: number, date: string): Promise<RawOccupancy> {
  'use cache'
  cacheLife({ revalidate: 1800 })
  cacheTag(`tenis4u-${courtId}-${date}`)

  const res = await fetch(`${UPSTREAM}/occupancy/${courtId}`, {
    headers: TENIS4U_HEADERS,
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`tenis4u occupancy ${courtId} failed: ${res.status}`)
  return res.json()
}

export async function searchTenis4u(params: SearchParams): Promise<ClubResult[]> {
  const results = await Promise.allSettled(
    COURT_IDS.map(async ({ id, clubName }) => {
      const occupancy = await fetchTenis4uOccupancy(id, params.date)
      const slots = extractSlots(occupancy, params)
      if (slots.length === 0) return null
      return {
        id: String(id),
        clubName,
        platform: Platform.Tenis4u,
        slots,
        bookingUrl: `https://app.tenis4u.pl/court/${id}`,
      } satisfies ClubResult
    }),
  )

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<ClubResult | null>).value!)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors for `tenis4u.server.ts`. Fix any that appear before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/tenis4u.server.ts
git commit -m "feat: add tenis4u server module with use cache"
```

---

## Task 4: twojtennis server module

**Files:**
- Create: `src/lib/api/twojtennis.server.ts`

**Interfaces:**
- Consumes: `filterTwojTennisSlots`, `RawFreeSlot`, `ClubLocation` from `./slot-filter`; `SearchParams`, `ClubResult`, `Platform` from `../types`
- Produces: `export async function searchTwojTennis(params: SearchParams): Promise<ClubResult[]>`

- [ ] **Step 1: Create twojtennis.server.ts**

Create `src/lib/api/twojtennis.server.ts`:

```ts
import { cacheLife, cacheTag } from 'next/cache'
import { Platform } from '../types'
import type { ClubResult, SearchParams } from '../types'
import { filterTwojTennisSlots } from './slot-filter'
import type { ClubLocation, RawFreeSlot } from './slot-filter'

const CLUBS_UPSTREAM = 'https://app-twojtenis-api-p-weu.azurewebsites.net'
const FREESLOTS_UPSTREAM = 'https://app-twojtenis-tech-krakow-api-p-weu.azurewebsites.net'
const ORIGIN = 'https://app.twojtenis.pl'
const REGION_ID = '31e247b1-1682-4e58-ba05-1bba6ca9ed23'

const TT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
}

type GroupClub = {
  id: string
  name: string
  isFavorite: boolean
  locations: { id: string; from: string; to: string }[]
}

type RawGroupClub = {
  id: string
  name: string
  isFavorite: boolean
  locations?: { id: string; from: string; to: string }[]
}

type RawGroupResponse = { clubs?: RawGroupClub[] }

type RawClubLocation = {
  id: string
  name: string
  type: number
  properties?: { SurfaceType?: string; TennisCourtType?: string }
}

type RawClubDetailResponse = { locations?: RawClubLocation[] }

type RawFreeslotsClub = {
  id: string
  name?: string
  containsEmptySlots: boolean
  spans?: Record<string, RawFreeSlot[]>
}

type RawFreeslotsResponse = { clubs?: RawFreeslotsClub[] }

async function fetchTwojTennisGroup(): Promise<GroupClub[]> {
  'use cache'
  cacheLife({ revalidate: 2592000 })
  cacheTag('twojtennis-group')

  const resp = await fetch(`${CLUBS_UPSTREAM}/api/v1/Clubs/search`, {
    method: 'POST',
    headers: TT_HEADERS,
    body: JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      forMinutes: 60,
      from: '00:00:00',
      to: '23:00:00',
      locationType: 0,
      regionId: REGION_ID,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) throw new Error(`TwojTenis Clubs/search failed: ${resp.status}`)
  const [group]: RawGroupResponse[] = await resp.json()
  return (group.clubs ?? [])
    .map((c) => ({ id: c.id, name: c.name, isFavorite: c.isFavorite, locations: c.locations ?? [] }))
    .filter((c) => c.locations.length > 0)
}

async function fetchTwojTennisClubDetail(clubId: string): Promise<ClubLocation[]> {
  'use cache'
  cacheLife({ revalidate: 2592000 })
  cacheTag(`twojtennis-club-${clubId}`)

  const resp = await fetch(`${CLUBS_UPSTREAM}/api/v1/Clubs/${clubId}`, {
    headers: TT_HEADERS,
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) return []
  const data: RawClubDetailResponse = await resp.json()
  return (data.locations ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    surfaceType: l.properties?.SurfaceType ?? '',
    courtType: l.properties?.TennisCourtType ?? '',
  }))
}

async function fetchTwojTennisFreeslots(date: string): Promise<RawFreeslotsResponse> {
  'use cache'
  cacheLife({ revalidate: 1800 })
  cacheTag(`twojtennis-${date}`)

  const group = await fetchTwojTennisGroup()

  const resp = await fetch(`${FREESLOTS_UPSTREAM}/api/v1/freeslots/search`, {
    method: 'POST',
    headers: TT_HEADERS,
    body: JSON.stringify({
      technicalGroupUrl: FREESLOTS_UPSTREAM,
      locationType: 0,
      date,
      forMinutes: 60,
      clubs: group.map((c) => ({
        id: c.id,
        name: c.name,
        isFavorite: c.isFavorite,
        locations: c.locations.map((l) => ({ id: l.id, from: '00:00:00', to: l.to })),
      })),
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!resp.ok) throw new Error(`TwojTenis freeslots failed: ${resp.status}`)
  const raw: RawFreeslotsResponse[] | RawFreeslotsResponse = await resp.json()
  return Array.isArray(raw) ? raw[0] : raw
}

async function buildLocationMap(clubIds: string[]): Promise<Map<string, ClubLocation>> {
  const details = await Promise.all(clubIds.map(fetchTwojTennisClubDetail))
  const map = new Map<string, ClubLocation>()
  for (const locations of details) {
    for (const loc of locations) map.set(loc.id, loc)
  }
  return map
}

export async function searchTwojTennis(params: SearchParams): Promise<ClubResult[]> {
  const [freeslotsData, group] = await Promise.all([
    fetchTwojTennisFreeslots(params.date),
    fetchTwojTennisGroup(),
  ])

  const locationMap = await buildLocationMap(group.map((c) => c.id))
  const results: ClubResult[] = []

  for (const club of freeslotsData.clubs ?? []) {
    if (!club.containsEmptySlots) continue
    const slots = filterTwojTennisSlots(club.spans ?? {}, locationMap, params)
    if (slots.length === 0) continue
    results.push({
      id: club.id,
      clubName: club.name ?? 'Nieznany klub',
      platform: Platform.TwojTennis,
      slots,
      bookingUrl: `https://app.twojtenis.pl/#/clubs/${club.id}?tab=bookings`,
    })
  }

  return results
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/twojtennis.server.ts
git commit -m "feat: add twojtennis server module with use cache"
```

---

## Task 5: `/api/search` Route Handler

**Files:**
- Create: `src/app/api/search/route.ts`

**Interfaces:**
- Consumes: `searchTenis4u` from `@/lib/api/tenis4u.server`; `searchTwojTennis` from `@/lib/api/twojtennis.server`; `SearchParams`, `ClubResult` from `@/lib/types`
- Produces: `GET /api/search?date=YYYY-MM-DD&from=HH:MM&to=HH:MM&forMinutes=N` → `ClubResult[]`

- [ ] **Step 1: Create the Route Handler**

Create `src/app/api/search/route.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { searchTenis4u } from '@/lib/api/tenis4u.server'
import { searchTwojTennis } from '@/lib/api/twojtennis.server'
import type { SearchParams } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const forMinutes = Number(searchParams.get('forMinutes') ?? '60')

  if (!date || !from || !to) {
    return NextResponse.json({ error: 'Missing required params: date, from, to' }, { status: 400 })
  }

  const params: SearchParams = { date, from, to, forMinutes }

  const [a, b] = await Promise.allSettled([
    searchTenis4u(params),
    searchTwojTennis(params),
  ])

  const results = [
    ...(a.status === 'fulfilled' ? a.value : []),
    ...(b.status === 'fulfilled' ? b.value : []),
  ]

  return NextResponse.json(results)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the route**

Start dev server in one terminal, then in another:

```bash
npm run dev
```

```bash
curl "http://localhost:3000/api/search?date=$(date +%Y-%m-%d)&from=09:00&to=12:00&forMinutes=60"
```

Expected: JSON array (may be empty if no courts available, but must be valid JSON, not an error).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "feat: add /api/search route handler"
```

---

## Task 6: Update page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `GET /api/search` from Task 5

- [ ] **Step 1: Replace API calls in page.tsx**

Open `src/app/page.tsx`. The current file starts with:

```ts
'use client'

import { Suspense, useCallback, useState } from 'react'
import { SearchForm } from '@/features/search/components/SearchForm'
import { searchTenis4u } from '@/lib/api/tenis4u'
import { searchTwojTennis } from '@/lib/api/twojtennis'
import type { ClubResult, SearchParams } from '@/lib/types'
import { ClubList, ClubListSkeleton } from '@/features/club/components/ClubList'
import { ErrorBoundary } from '@/components/error-boundary'
const MIN_TIME_PERIOD = 60;
```

Replace the entire file with:

```ts
'use client'

import { Suspense, useCallback, useState } from 'react'
import { SearchForm } from '@/features/search/components/SearchForm'
import type { ClubResult, SearchParams } from '@/lib/types'
import { ClubList, ClubListSkeleton } from '@/features/club/components/ClubList'
import { ErrorBoundary } from '@/components/error-boundary'

const MIN_TIME_PERIOD = 60

export default function HomePage() {
  const [clubs, setClubs] = useState<Promise<ClubResult[]> | null>(null)
  const [loading, setLoading] = useState(false)

  const search = useCallback((params: Omit<SearchParams, 'forMinutes'>) => {
    setLoading(true)
    const qs = new URLSearchParams({
      date: params.date,
      from: params.from,
      to: params.to,
      forMinutes: String(MIN_TIME_PERIOD),
    })
    setClubs(
      fetch(`/api/search?${qs}`)
        .then((r) => {
          if (!r.ok) throw new Error('Search failed')
          return r.json() as Promise<ClubResult[]>
        })
        .then((res) => {
          if (res.length === 0) return Promise.reject(new Error('Brak wyników'))
          return res
        })
        .finally(() => setLoading(false))
    )
  }, [])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Korty Kraków</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dostępność kortów tenisowych w jednym miejscu</p>
      </div>
      <SearchForm loading={loading} onSearch={search} />
      {clubs && (
        <Suspense fallback={<ClubListSkeleton />}>
          <ErrorBoundary fallback={<p>Błąd podczas wyszukiwania. Spróbuj ponownie.</p>}>
            <ClubList clubsPromise={clubs} />
          </ErrorBoundary>
        </Suspense>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verify in browser**

With dev server running (`npm run dev`), open `http://localhost:3000`, pick a date and time, click Szukaj. Results should appear. Open DevTools → Network — confirm the request goes to `/api/search?...` and returns a JSON array.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire page.tsx to /api/search route"
```

---

## Task 7: Delete dead code

**Files:**
- Delete: `src/app/api/tenis4u/[...path]/route.ts`
- Delete: `src/app/api/twojtennis/[...path]/route.ts`
- Delete: `src/app/api/twojtennis-tech/[...path]/route.ts`
- Delete: `src/lib/api/tenis4u.ts`
- Delete: `src/lib/api/twojtennis.ts`

- [ ] **Step 1: Delete proxy routes and old client files**

```bash
rm src/app/api/tenis4u/[...path]/route.ts
rmdir src/app/api/tenis4u/\[...path\] src/app/api/tenis4u
rm src/app/api/twojtennis/[...path]/route.ts
rmdir src/app/api/twojtennis/\[...path\] src/app/api/twojtennis
rm src/app/api/twojtennis-tech/[...path]/route.ts
rmdir src/app/api/twojtennis-tech/\[...path\] src/app/api/twojtennis-tech
rm src/lib/api/tenis4u.ts
rm src/lib/api/twojtennis.ts
```

- [ ] **Step 2: Type-check and test**

```bash
npx tsc --noEmit && npm test
```

Expected: no TypeScript errors, all tests pass.

- [ ] **Step 3: Final smoke test**

Restart dev server and confirm search still works end-to-end in the browser.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete CORS proxy routes and obsolete client API modules"
```
