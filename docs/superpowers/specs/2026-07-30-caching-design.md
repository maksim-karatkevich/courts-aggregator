# Server-Side Caching with `'use cache'`

**Date:** 2026-07-30
**Status:** Approved

## Problem

Both `searchTenis4u` and `searchTwojTennis` run in the browser (`page.tsx` is `'use client'`). Every search triggers fresh upstream API calls with no caching. The twojtennis client has a `localStorage` cache for club metadata but it is useless on Vercel where function instances don't share state.

## Goal

Cache full-day availability data server-side so that multiple searches for the same date (different time windows) hit the cache instead of the upstream API. Revalidate every 30 minutes.

## Architecture

```
Browser (page.tsx)
  → fetch("/api/search?date=X&from=Y&to=Z")
      → /api/search/route.ts  (Route Handler, server-side)
          → fetchTenis4uOccupancy(courtId, date)  ['use cache', 30 min]
          → fetchTwojTennisDay(date)              ['use cache', 30 min]
          → filter both results locally by from/to/forMinutes
          → return ClubResult[]
```

Server-to-server requests have no CORS restrictions, so the proxy routes are no longer needed and are deleted.

## Cached Fetchers

### tenis4u — `lib/api/tenis4u.server.ts`

```ts
async function fetchTenis4uOccupancy(courtId: number, date: string): Promise<RawOccupancy> {
  'use cache'
  cacheLife({ revalidate: 1800 })
  cacheTag(`tenis4u-${courtId}-${date}`)
  // fetches https://api.tenis4u.pl/occupancy/${courtId} with spoofed headers
}
```

Cache key: `(courtId, date)` — 7 courts × N dates = 7N entries. The upstream already returns full-day data, so no change to the response shape.

### twojtennis — `lib/api/twojtennis.server.ts`

```ts
async function fetchTwojTennisDay(date: string): Promise<RawFreeslotsResponse> {
  'use cache'
  cacheLife({ revalidate: 1800 })
  cacheTag(`twojtennis-${date}`)
  // freeslots body uses from: "00:00:00" — full day
}
```

Cache key: `(date)` — one entry per day regardless of how many time-window searches happen.

Club list (`Clubs/search`) and club details (`Clubs/{id}`) are also wrapped with `'use cache'` at `cacheLife({ revalidate: 2592000 })` (30 days), replacing the `localStorage` caches.

## Local Filtering

### tenis4u

No change — `extractSlots` already clips free slots to the user's `from`/`to` window and filters by `forMinutes`. It runs against the cached `RawOccupancy`.

### twojtennis

Add `filterTwojTennisSlots(spans, params)` using the same clip logic as `extractSlots`:
- Keep spans that overlap `[params.from, params.to]`
- Clip each span to the window
- Drop spans shorter than `params.forMinutes`

This replaces the upstream `from` filter that was previously handled by the API.

## `/api/search` Route Handler

`GET /api/search?date=YYYY-MM-DD&from=HH:MM&to=HH:MM&forMinutes=N`

- Runs both platform fetchers in parallel (`Promise.allSettled`)
- Filters results locally
- Returns `ClubResult[]` as JSON
- One failing platform does not block the other

## Client Changes (`page.tsx`)

Replace direct calls to `searchTenis4u` / `searchTwojTennis` with a single `fetch('/api/search?...')`. The rest of the component (state, Suspense, ErrorBoundary) stays unchanged.

## Cleanup

| What | Action |
|---|---|
| `/api/tenis4u/[...path]/route.ts` | Delete — CORS proxy no longer needed |
| `/api/twojtennis/[...path]/route.ts` | Delete — same reason |
| `/api/twojtennis-tech/[...path]/route.ts` | Delete — same reason |
| `memGroup`, `readGroupLs`, `writeGroupLs` | Delete — replaced by `'use cache'` |
| `memDetails`, `readDetailLs`, `writeDetailLs` | Delete — replaced by `'use cache'` |

## Config

Add to `next.config.ts` if required by Next.js 16:

```ts
experimental: {
  dynamicIO: true,
}
```

Verify whether this flag is still needed — it may have graduated to stable in 16.x.

## Cache TTLs

| Data | TTL | Reason |
|---|---|---|
| Court availability (tenis4u) | 30 min | Balances freshness vs. API load |
| Court availability (twojtennis) | 30 min | Same |
| Club list (twojtennis) | 30 days | Clubs rarely added/removed |
| Club details (twojtennis) | 30 days | Court names/surfaces rarely change |
