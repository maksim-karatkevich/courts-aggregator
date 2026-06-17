# Courts Aggregator — Rewrite Design

**Date:** 2026-06-17
**Goal:** Rewrite the frontend from scratch (React learning project) and ship as a hosted public URL for Kraków tennis players.

---

## Context

Existing POC (`courts.aggregator`) aggregates available court slots from two Polish tennis booking platforms — TwojTenis and Tenis4u — into a single view. It worked as a local Vite + React app with a local `proxy.js`. This rewrite makes it publicly deployable and replaces the vibe-coded UI with a clean, manually written React codebase.

**The user's primary goal is hands-on React experience.** The user writes the code; Claude reviews. Do not write component logic, hooks, or state management unprompted.

---

## Architecture

```
Browser
  └── Next.js App Router (single deployed unit)
        ├── app/                    React frontend (Client Components)
        └── app/api/
              ├── tenis4u/[...path]/route.ts   proxy → api.tenis4u.pl
              └── twojtennis/[...path]/route.ts proxy → TwojTenis APIs
```

Next.js API routes replace `proxy.js`. They forward requests server-side with the correct `Origin` and `Referer` headers that the upstream APIs require. The browser never calls the tennis APIs directly.

No database. No auth. Public URL.

---

## Pages & Routing

| Route | Description |
|-------|-------------|
| `/` | Home — search form + club results list |
| `/club/[id]` | Club calendar — week grid showing court availability |

State shared between pages travels via URL search params:

```
/club/[id]?date=2026-06-17&from=07:00&to=23:00&platform=twojtennis
```

No global state store. No context. Just URL params and local component state.

---

## Components

```
app/
  page.tsx                    Home — manages search state, fetches results
  club/[id]/page.tsx          Club page — reads URL params, renders calendar

components/
  SearchForm.tsx              Date picker + from/to time selects + search button
  ClubList.tsx                Maps ClubResult[] → ClubCard list
  ClubCard.tsx                Club name, platform badge, available slot count, navigate link
  CalendarGrid.tsx            Composes DayTabs + CourtGrid, manages selectedDate state
  DayTabs.tsx                 7-day tab strip with prev/next week navigation
  CourtGrid.tsx               Table: courts as columns, 30-min time blocks as rows
```

### shadcn components

Install at project init:
```
npx shadcn@latest add button calendar popover select card badge table skeleton
```

| shadcn component | Used in |
|-----------------|---------|
| `button` | SearchForm, DayTabs week nav, ClubCard link |
| `calendar` + `popover` | Date picker in SearchForm |
| `select` | From/to time dropdowns in SearchForm |
| `card` | ClubCard wrapper |
| `badge` | Platform label (TwojTenis / Tenis4u) |
| `table` | CourtGrid underlying structure |
| `skeleton` | Loading states in ClubList and CourtGrid |

---

## Reused from POC (no changes)

These files move into the new project as-is:

- `lib/types.ts` — `SearchParams`, `TimeSlot`, `ClubResult`, `ClubCalendar`, `StationCalendar`, `DaySlots`
- `lib/api/twojtennis.ts` — `searchTwojTennis`, `fetchTwojTennisDay`, `getClubLocationIds`, hardcoded Kraków club list
- `lib/api/tenis4u.ts` — `searchTenis4u`, `getTenis4uCalendar`, occupancy parsing
- `lib/api/surface.ts` — `detectSurface`, `surfaceColor`, `SURFACE_COLORS`

Only the base URL path changes: `/api/tenis4u` and `/api/twojtennis` stay the same (Next.js API routes use the same prefixes).

---

## Data Flow

### Home page (`/`)

```
User fills SearchForm (date, from, to) and clicks Search button
  → page.tsx pushes updated URL search params (?date=&from=&to=)
  → useQuery([date, from, to]) fires (keyed to URL params)
  → Promise.allSettled([searchTwojTennis(params), searchTenis4u(params)])
  → ClubList renders ClubResult[]
  → user clicks a ClubCard → router.push('/club/[id]?date=&from=&to=&platform=')
```

Search is button-triggered, not reactive — avoids firing multiple parallel API calls while the user is still picking a time.

### Club page (`/club/[id]`)

```
Page mounts, reads id + params from URL
  → useQuery([clubId, date]) fires appropriate fetcher:
      platform === 'twojtennis' → fetchTwojTennisDay (lazy, per date)
      platform === 'tenis4u'   → getTenis4uCalendar (fetches full week upfront)
  → CalendarGrid renders
  → user clicks day tab → selectedDate state updates locally
  → user clicks prev/next week:
      tenis4u: paginate through already-fetched data
      twojtennis: fetch new date lazily, cache in useRef
```

### Tenis4u court list cache

```
On app load (hook: useTenis4uCourts):
  → read localStorage: { courts: { id: string; name: string; address: string }[], savedAt: number }
  → if missing or Date.now() - savedAt > 30 days:
      → GET /api/tenis4u/court/all
      → filter: court.address.toLowerCase().includes('krak')
      → save { courts, savedAt: Date.now() } to localStorage
  → return court IDs for use in searchTenis4u
```

This runs transparently on first visit, then silently refreshes monthly. No user interaction required.

---

## Error Handling

- If either platform fails during search → show partial results + a dismissible banner ("TwojTenis unavailable — showing Tenis4u results only")
- If `/court/all` fails on load → fall back to hardcoded Kraków court IDs kept as a constant in `tenis4u.ts`
- If individual court occupancy fetch fails → skip silently (same as POC)
- Loading states → `skeleton` components while queries are in flight

---

## Out of Scope (for now)

- Favorite courts
- City selector (hardcoded to Kraków)
- Authentication
- Any server-side data storage
