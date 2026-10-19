# UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense result cards with a compact club list plus a full-day court calendar (side panel on desktop, `/club/[id]` page on mobile), a richer search form, and an installable PWA manifest.

**Architecture:**
- `/api/search` keeps its contract and caching and gains one field, `daySlots` (the club's whole day, unclipped). The calendar is built from `daySlots` by a pure model (`day-grid.ts`), so opening a club needs no extra request.
- The search becomes URL-driven (`/?date=…&from=…&to=…&forMinutes=…`) and is read through one React Query hook. That makes the mobile "← Wyniki" link and the browser Back button restore the results.
- Account features (`StarButton`, `rankClubs`, `orderCourts`, `useRecordBookingClick`) are consumed unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4 + shadcn/base-ui, React Query, date-fns, Vitest (+ Testing Library, jsdom per file).

**Spec:** `docs/superpowers/specs/2026-10-13-ux-redesign-design.md` (read it with this plan). Favorites storage is in `docs/superpowers/specs/2026-10-15-accounts-and-preferences-design.md` and is already shipped.

**Branch:** work on a new branch `feat/ux-redesign` cut from the current branch `refactor/account-feature-structure` (it holds the account layout this plan imports from).

**Learning mode:** the user builds this project to learn. At the end of each task the implementer writes 2–4 plain-language sentences in the task report: what was built, why this way, one alternative and its cost. No jargon without a one-line explanation.

## Deviations from the spec (flag these to the user at review)

1. **`/club/[id]` also takes `?platform=`.** A club is identified by `platform:id` everywhere else; the id alone could in principle collide across providers.
2. **Search params live in the home page URL**, not only in memory. The spec's back button ("returns to the search results") cannot work otherwise, because navigating to `/club/[id]` unmounts the home page.
3. **Quick-pick labels are Polish:** `Dziś`, `Jutro`, `Weekend` (the spec lists them in English; every other label in the app is Polish).
4. **No `next-pwa`.** It wraps the webpack config, is unmaintained, and this repo builds on Next 16. The plan ships `manifest.ts` plus generated icons, which is what "Add to Home Screen" needs. No service worker: the app is useless offline (it shows live availability). Compatibility of `next-pwa` with Next 16 was not tested; the choice is by risk, not by a failed attempt.
5. **Time dropdowns:** hourly steps by default with a "Co 30 min" toggle (one of the two options the spec allows).
6. **`groupByCourt` stays in `features/club/group-by-court.ts`** and is reused by the calendar model, instead of being moved into a component (the project rule is one component per file; helpers stay out of components).
7. **`CourtRow.tsx` is deleted.** Compact cards have no per-court rows; the court-level booking click now lives on green calendar cells.

## Global Constraints

- **Day grid:** rows are hours `07:00`–`22:00`; the last row is `22:00 – 23:00`. Constants `DAY_START_HOUR = 7`, `DAY_END_HOUR = 23`.
- **Cell rule:** a cell (court × hour) is free only if one span for that court covers the whole hour.
- **Window highlight:** rows overlapping the search window get a light blue background and blue time labels, with a thin blue line above the first and below the last such row. Legend: `wolny`, `zajęty`, `Twoje okno 13:00 – 17:00`.
- **Initial scroll:** the hour before the window is the first visible row (never earlier than 07:00). No window means no highlight and no scroll.
- **Durations:** `60 | 90 | 120` minutes, field label `Czas gry`.
- **Desktop layout:** `lg` breakpoint (1024px). Left column 300px fixed, right column fills the rest. Section headings `⭐ Ulubione` and `Wszystkie wyniki`. Empty right panel text: `Wybierz klub z listy, aby zobaczyć dostępne terminy`.
- **Panel animation:** `translateX(20px) → 0`, `opacity 0 → 1`, `300ms ease`, re-run when another club is selected.
- **Copy:** booking button `Zarezerwuj →`; mobile back link `← Wyniki`.
- **Clubs returned by `/api/search` do not change:** a club is included only if `slots` (window and duration clipped) is non-empty. List and card counts use `slots`; the calendar uses `daySlots`.
- **Booking clicks:** a green cell calls `recordBookingClick(ref, courtName)` (`null` for an unnamed court); the header button calls `recordBookingClick(ref, null)`. Both open `bookingUrl` in a new tab (`target="_blank" rel="noopener noreferrer"`).
- **Code rules:** one React component per file, small components, helpers in their own non-component modules. Tests live in `src/__tests__/`, import with the `@/` alias, and component tests start with `// @vitest-environment jsdom`. There is no jest-dom: assert on the DOM directly.
- **Commits:** end every commit message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

Failure modes the spec implies but does not spell out, most likely first. Each has a test in the task named in brackets.

1. A free span that ends at midnight (`00:00` or `24:00`): the 22:00 row must still show as free, not empty. [Task 2]
2. Court names with numbers (`Kort 10` vs `Kort 2`) and slots with no court name: stable, natural column order, the unnamed court in one `—` column. [Task 2]
3. A search window that is not hour-aligned (`13:30 – 15:30`): the overlapped rows (13, 14, 15) are highlighted and scrolling still starts at the hour before. [Task 2]
4. A hand-edited or shared `/club/[id]` link: missing, garbage or inverted `from`/`to`, unknown platform, a club with nothing free: a readable message, never a crash or a blank page. [Task 7]
5. Longer duration than the chosen window (pick `120 min` with a 13:00–14:00 window): `Do` is pushed forward, never left invalid. [Task 4]

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` (modify) | `ClubResult.daySlots`, `SearchWindow`, `DURATIONS` |
| `src/lib/api/slot-filter.ts` (modify) | `extractDaySlots`, `filterTwojTennisDaySlots` |
| `src/lib/api/tenis4u.ts`, `twojtennis.ts` (modify) | fill `daySlots` |
| `src/features/calendar/model/day-grid.ts` (create) | pure calendar model |
| `src/features/calendar/hooks/use-initial-scroll.ts` (create) | scroll the grid on open |
| `src/features/calendar/components/CalendarGrid.tsx`, `CalendarLegend.tsx`, `CalendarPanel.tsx`, `CalendarEmptyState.tsx` (create) | calendar UI, shared by desktop and mobile |
| `src/features/search/model/search-url.ts` (create) | query string ⇄ search params |
| `src/features/search/model/form-model.ts` (create) | quick-pick dates, time options, `Do` clamping |
| `src/features/search/hooks/use-search-results.ts` (create) | one React Query hook over `/api/search` |
| `src/features/search/components/SearchForm.tsx` (rewrite), `DateField.tsx`, `DateQuickPicks.tsx`, `DurationPicker.tsx`, `TimeSelect.tsx` (create), `SearchPage.tsx` (create) | form and page body |
| `src/features/club/summarize-club.ts` (create) | card summary numbers and copy |
| `src/features/club/club-href.ts` (create) | `/club/[id]` link builder |
| `src/features/club/components/ClubCard.tsx` (rewrite), `ClubList.tsx` (rewrite), `ClubListSkeleton.tsx` (rewrite), `ResultsView.tsx`, `ClubPageContent.tsx` (create); `CourtRow.tsx` (delete) | list and screens |
| `src/hooks/use-media-query.ts` (create) | desktop vs mobile click behavior |
| `src/app/page.tsx`, `src/app/club/[id]/page.tsx` (modify), `src/app/globals.css` (modify) | thin pages, animation keyframes |
| `src/app/manifest.ts`, `icon.tsx`, `apple-icon.tsx` (create) | PWA |

---

### Task 1: `daySlots` from the API

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/api/slot-filter.ts`, `src/lib/api/tenis4u.ts`, `src/lib/api/twojtennis.ts`, `src/app/api/search/route.ts` (import `DURATIONS`)
- Test: `src/__tests__/slot-filter.test.ts`, `src/__tests__/ranking.test.ts` (helper gets `daySlots: []`)

**Interfaces:**
- Produces: `ClubResult.daySlots: TimeSlot[]` (required); `interface SearchWindow { from: string; to: string }` (`HH:MM`); `const DURATIONS = [60, 90, 120] as const`; `extractDaySlots(occupancy: RawOccupancy, params: Pick<SearchParams, 'date'>): TimeSlot[]`; `filterTwojTennisDaySlots(spans: Record<string, RawFreeSlot[]>, locationMap: Record<string, LocationInfo>): TimeSlot[]`.

- [ ] **Step 1: Write the failing tests** in `slot-filter.test.ts`:
  - `extractDaySlots returns every free span of the date, unclipped, with no duration filter`: one station `Kort 1`/`Mączka`, date `2026/07/30` with free hours `06:30:00–07:00:00` and `18:00:00–22:00:00`, plus a span on `2026/07/31`. Expect exactly `[{ from: '06:30', to: '07:00', courtName: 'Kort 1', surfaceType: 'Mączka' }, { from: '18:00', to: '22:00', courtName: 'Kort 1', surfaceType: 'Mączka' }]`.
  - `extractDaySlots skips spans with a missing begin or end time`.
  - `filterTwojTennisDaySlots maps location ids to court name, surface and court type`, with a span the window filter would drop (30 min long) still present.
- [ ] **Step 2: Run** `npx vitest run src/__tests__/slot-filter.test.ts`. Expected: FAIL, `extractDaySlots is not a function`.
- [ ] **Step 3: Implement** both functions in `slot-filter.ts`, normalizing times through `minutesToHHMM(timeToMinutes(x))` (so `06:30:00` becomes `06:30`). Add `daySlots` to `ClubResult` and `SearchWindow`/`DURATIONS` to `types.ts`; make `route.ts` import `DURATIONS` instead of its local copy. In both providers fill `daySlots` next to `slots`; the inclusion rule (`slots.length === 0` → skip) stays exactly as is.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`. Expected: all PASS, no type errors (the `ranking.test.ts` helper needed `daySlots: []`).
- [ ] **Step 5: Verify against the real endpoint.** Start the dev server (port 3002, see `.claude/launch.json`), then run `curl -s "localhost:3002/api/search?date=<tomorrow>&from=13:00&to=17:00&forMinutes=60" | jq '[.[] | {n: .clubName, s: (.slots|length), d: (.daySlots|length)}]'`. Expected: every club has `d >= s` and `s > 0`.
- [ ] **Step 6: Commit** `feat: return full-day slots from /api/search`.

---

### Task 2: Day-grid model

**Files:**
- Create: `src/features/calendar/model/day-grid.ts`
- Test: `src/__tests__/day-grid.test.ts`

**Interfaces:**
- Consumes: `TimeSlot`, `SearchWindow` (`@/lib/types`); `groupByCourt`, `UNNAMED_COURT` (`@/features/club/group-by-court`); `orderCourts` (`@/features/account/model/ranking`).
- Produces:
  ```ts
  export const DAY_START_HOUR = 7
  export const DAY_END_HOUR = 23
  export interface CourtColumn { name: string; surface?: string; free: boolean[] } // free[i] is the hour DAY_START_HOUR + i
  export function buildCourtColumns(daySlots: TimeSlot[], lastCourt: string | null): CourtColumn[]
  export function windowHours(window: SearchWindow | null): { first: number; last: number } | null
  export function initialScrollHour(window: SearchWindow | null): number
  ```

- [ ] **Step 1: Write the failing tests** (`describe` per function):
  - `buildCourtColumns`: `Kort 1` span `13:00–15:30` gives `free` true only for hours 13 and 14 (15 is half covered); `free.length === 16`. Two spans `13:00–14:00` and `14:00–15:00` give 13 and 14 free. A span `21:00–00:00` and another court's `21:00–24:00` both give hours 21 and 22 free (Review Focus 1). Courts `Kort 2`, `Kort 10`, `Kort 1` come out `Kort 1, Kort 2, Kort 10`; with `lastCourt = 'Kort 10'` it is first, the rest keep order. Slots without `courtName` form one column named `UNNAMED_COURT`. `surface` is the first non-empty `surfaceType` of that court. Empty input gives `[]`.
  - `windowHours`: `13:00–17:00` gives `{ first: 13, last: 16 }`; `13:30–15:30` gives `{ first: 13, last: 15 }`; `null`, `15:00–15:00` and `17:00–13:00` give `null`.
  - `initialScrollHour`: window `13:00–17:00` gives 12; window starting `07:00` or `08:00` gives 7; `null` gives 7.
- [ ] **Step 2: Run** `npx vitest run src/__tests__/day-grid.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** Convert a span's end with `timeToMinutes` and treat an end that is `<=` its start (`00:00`) as `+ 1440`. Natural order via `localeCompare(b, 'pl', { numeric: true })` before `orderCourts`. A row overlaps the window when `hour * 60 < toMin && (hour + 1) * 60 > fromMin`; clamp `first`/`last` into the day range.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add pure day-grid model for the court calendar`.

---

### Task 3: Search URL model and results hook

**Files:**
- Create: `src/features/search/model/search-url.ts`, `src/features/search/hooks/use-search-results.ts`
- Test: `src/__tests__/search-url.test.ts`, `src/__tests__/use-search-results.test.ts` (jsdom)

**Interfaces:**
- Consumes: `SearchParams`, `SearchWindow`, `DURATIONS`, `ClubResult`.
- Produces:
  ```ts
  export function toQueryString(p: SearchParams): string          // date, from, to, forMinutes
  export function parseSearchParams(sp: URLSearchParams): SearchParams | null
  export interface ClubSearch { date: string; window: SearchWindow | null; forMinutes: number }
  export function parseClubSearch(sp: URLSearchParams, today: string): ClubSearch   // never throws
  export function toSearchParams(c: ClubSearch): SearchParams     // window null → 07:00–23:00
  export function useSearchResults(params: SearchParams | null): UseQueryResult<ClubResult[]>
  ```

- [ ] **Step 1: Write the failing tests.**
  - `parseSearchParams`: valid query returns the params; missing `date`, malformed `from`, or `from >= to` returns `null`; `forMinutes` missing or not in `DURATIONS` becomes 60.
  - `parseClubSearch`: no params gives `{ date: today, window: null, forMinutes: 60 }`; garbage or inverted `from`/`to` gives `window: null`; valid ones give the window; bad `date` falls back to `today`.
  - `toSearchParams` with `window: null` gives `from: '07:00', to: '23:00'`; `toQueryString` round-trips through `parseSearchParams`.
  - `useSearchResults(null)` never calls `fetch`; with params it calls `/api/search?date=…&from=…&to=…&forMinutes=…` once and returns the JSON; a non-OK response puts the query in the error state.
- [ ] **Step 2: Run** both test files. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement.** `useSearchResults` is `useQuery` with key `['search', date, from, to, forMinutes]`, `enabled: params !== null`, and a `queryFn` that throws `Search failed: <status>` when `!res.ok`. Dates are validated with `/^\d{4}-\d{2}-\d{2}$/`, times with `/^\d{2}:\d{2}$/` (same patterns as the route).
- [ ] **Step 4: Run** both test files. Expected: PASS.
- [ ] **Step 5: Commit** `feat: make search params URL-driven and share one results hook`.

---

### Task 4: Search form

**Files:**
- Create: `src/features/search/model/form-model.ts`, `DateField.tsx`, `DateQuickPicks.tsx`, `DurationPicker.tsx`, `TimeSelect.tsx` (all under `src/features/search/components/` except the model)
- Modify (rewrite): `src/features/search/components/SearchForm.tsx`
- Test: `src/__tests__/form-model.test.ts`, `src/__tests__/search-form.test.tsx` (jsdom)

**Interfaces:**
- Consumes: `DURATIONS`, `SearchParams`; existing `Calendar`, `Popover`, `Select`, `Button`.
- Produces:
  ```ts
  export type QuickPick = 'today' | 'tomorrow' | 'weekend'
  export function quickPickDate(kind: QuickPick, now: Date): Date
  export function timeOptions(step: 30 | 60, keep?: string[]): string[]            // 06:00–23:00, `keep` values merged in, sorted
  export function minTo(from: string, forMinutes: number): string                  // from + duration as HH:MM
  export function clampTo(to: string, from: string, forMinutes: number): string    // to, or minTo(...) when to is earlier
  // SearchForm
  interface Props { onSearch: (p: SearchParams) => void; loading?: boolean; initial?: SearchParams }
  ```

- [ ] **Step 1: Write the failing tests.**
  - `quickPickDate`: from Wednesday 2026-10-21, `today` is that day, `tomorrow` is 2026-10-22, `weekend` is Saturday 2026-10-24. From Saturday and from Sunday, `weekend` returns the same day.
  - `timeOptions(60)` starts `06:00, 07:00` and ends `23:00` (18 items); `timeOptions(30)` has 35; `timeOptions(60, ['13:30'])` contains `13:30` between `13:00` and `14:00`.
  - `minTo('14:00', 90)` is `15:30`. `clampTo('14:30', '14:00', 120)` is `16:00`; `clampTo('18:00', '14:00', 60)` stays `18:00` (Review Focus 5).
  - `SearchForm` (system time fixed with `vi.setSystemTime`): clicking `Jutro` then `Szukaj` calls `onSearch` with tomorrow's `yyyy-MM-dd`, `from: '07:00'`, `to: '23:00'`, `forMinutes: 60`. Clicking `90 min` then `Szukaj` gives `forMinutes: 90`. With `initial` passed, the first search emits those values. The `Czas gry` group has three buttons with `aria-pressed` on the active one.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement** the model, then the components. `SearchForm` owns the state (date, from, to, forMinutes, step) and composes `DateField` (the existing popover), `DateQuickPicks` (three chips `Dziś`, `Jutro`, `Weekend`; the chip matching the current date is `aria-pressed`), `DurationPicker` (label `Czas gry`, buttons `60 min`, `90 min`, `120 min`), and two `TimeSelect`s plus a `Co 30 min` toggle (default off, hourly). Changing `from` or the duration runs `clampTo`; `from` options exclude values whose `minTo` passes `23:00`. Keep the `useEffect` that sets today's date after mount (avoids a server/client date mismatch), unless `initial` is given.
- [ ] **Step 4: Run** both files and `npx tsc --noEmit`. `SearchForm` will not type-check against `src/app/page.tsx` yet; that page is rewritten in Task 8, so run `tsc` only on this task's files (ignore errors from `page.tsx`).
- [ ] **Step 5: Commit** `feat: search form with duration, date quick-picks and hourly time steps`.

---

### Task 5: Calendar components

**Files:**
- Create: `src/features/calendar/hooks/use-initial-scroll.ts`, `src/features/calendar/components/CalendarGrid.tsx`, `CalendarLegend.tsx`, `CalendarPanel.tsx`, `CalendarEmptyState.tsx`
- Test: `src/__tests__/calendar.test.tsx` (jsdom)

**Interfaces:**
- Consumes: `buildCourtColumns`, `windowHours`, `initialScrollHour`, `DAY_START_HOUR`, `DAY_END_HOUR` (Task 2); `StarButton`, `usePreferences`, `lastCourtFor`, `useRecordBookingClick`.
- Produces:
  ```ts
  CalendarGrid({ columns: CourtColumn[]; window: SearchWindow | null; bookingUrl: string; onBook: (court: string | null) => void; resetKey: string })
  CalendarLegend({ window: SearchWindow | null })
  CalendarPanel({ club: ClubResult; date: string; window: SearchWindow | null; leading?: ReactNode })
  CalendarEmptyState()
  useInitialScroll(containerRef: RefObject<HTMLElement | null>, firstHour: number, resetKey: string): void
  ```

- [ ] **Step 1: Write the failing tests.**
  - `CalendarGrid`: renders one header per court (name, and surface when present) and 16 hour rows labelled `07:00` … `22:00`; a free cell is an `<a>` with `href === bookingUrl`, `target="_blank"` and `rel` containing `noopener`; a taken cell is not a link; clicking a free cell calls `onBook('Kort 1')`; for an unnamed court it calls `onBook(null)`; with window `13:00–17:00`, rows 13–16 carry `data-in-window="true"` and the others do not; with `window = null` none do.
  - `CalendarLegend`: shows `wolny`, `zajęty` and `Twoje okno 13:00 – 17:00`; without a window the last item is absent.
  - `CalendarPanel` (account hooks and `StarButton` mocked with `vi.mock`): shows the club name, the date and a hint; the `Zarezerwuj →` link has the club's `bookingUrl` and clicking it calls `recordBookingClick({ platform, clubId }, null)`; `leading` is rendered before the name; the first column is the last booked court when `usePreferences` reports one.
  - `CalendarEmptyState` contains `Wybierz klub z listy, aby zobaczyć dostępne terminy`.
- [ ] **Step 2: Run** `npx vitest run src/__tests__/calendar.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** The grid is a CSS grid (`grid-template-columns: 56px repeat(n, minmax(96px, 1fr))`) inside a `position: relative` scroll container (`data-testid="calendar-scroll"`) with a sticky court header, so many courts scroll horizontally. Each row has `data-hour`; the window's first and last rows carry the blue top and bottom border. `useInitialScroll` sets `container.scrollTop` to `row.offsetTop - header.offsetHeight` for the row `data-hour === firstHour`, in a layout effect keyed on `resetKey`. `CalendarPanel` computes columns with `lastCourtFor` and wires `onBook` to `recordBookingClick`; it holds the club-name header, the date and hint subtitle, `StarButton`, and the `Zarezerwuj →` link. The panel shell has the class `calendar-panel-in` (defined in Task 8).
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add court calendar grid, legend and panel`.

---

### Task 6: Compact club list

**Files:**
- Create: `src/features/club/summarize-club.ts`
- Modify (rewrite): `src/features/club/components/ClubCard.tsx`, `ClubList.tsx`, `ClubListSkeleton.tsx`
- Delete: `src/features/club/components/CourtRow.tsx`
- Test: `src/__tests__/summarize-club.test.ts`, `src/__tests__/club-card.test.tsx` (jsdom)

**Interfaces:**
- Consumes: `groupByCourt`, `UNNAMED_COURT`, `rankClubs`, `usePreferences`, `useFavoritesSaveError`, `StarButton`, `clubKey`.
- Produces:
  ```ts
  export interface ClubSummary { courtCount: number; surfaces: string[]; slotCount: number; earliest: string; latest: string }
  export function summarizeClub(club: ClubResult): ClubSummary   // from club.slots, the window only
  export function formatCourtCount(n: number): string            // "1 kort", "2 korty", "5 kortów"
  ClubCard({ club: ClubResult; favorite: boolean; selected: boolean; onOpen: (club: ClubResult) => void })
  ClubList({ clubs: ClubResult[]; selectedKey: string | null; onOpen: (club: ClubResult) => void })
  ```

- [ ] **Step 1: Write the failing tests.**
  - `summarizeClub`: slots `Kort 1`/`Mączka` 13:00–14:00 and 14:00–15:00, `Kort 2`/`Hala` 15:00–16:00 give `{ courtCount: 2, surfaces: ['Hala', 'Mączka'], slotCount: 3, earliest: '13:00', latest: '16:00' }`. Slots without court names count as one court; missing surfaces are omitted. `formatCourtCount` gives `1 kort`, `2 korty`, `4 korty`, `5 kortów`, `12 kortów`.
  - `ClubCard` (`StarButton` mocked): shows club name, `2 korty · Hala, Mączka`, and `3 wolnych · 13:00–16:00`; clicking the main button calls `onOpen(club)` once; clicking the star does not call `onOpen`; `selected` sets `aria-current="true"`; a favorite gets the gold left border class, otherwise green for `tenis4u` and orange for `twojtennis`; the card has no booking link.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement.** The card is a `div` with the star as a sibling of the main `<button>` (name, summary lines, chevron `›`; blue when selected), so the star never nests inside a button. `ClubList` keeps the current ranking and the two error banners (`failed`, `saveError`), renders `⭐ Ulubione` then `Wszystkie wyniki` (the heading pair appears only when there are favorites), drops the 760px max-width so it fills its column, and keeps the "N klubów z dostępnymi kortami" counter line. The skeleton becomes three compact card placeholders. Delete `CourtRow.tsx`.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Commit** `feat: compact club cards and list`.

---

### Task 7: Mobile club page

**Files:**
- Create: `src/features/club/club-href.ts`, `src/features/club/components/ClubPageContent.tsx`
- Modify: `src/app/club/[id]/page.tsx` (keep the `Suspense` wrapper, render `ClubPageContent`)
- Test: `src/__tests__/club-href.test.ts`, `src/__tests__/club-page.test.tsx` (jsdom)

**Interfaces:**
- Consumes: `parseClubSearch`, `toSearchParams`, `toQueryString`, `useSearchResults`, `CalendarPanel`, `Platform`.
- Produces: `clubHref(club: { platform: Platform; id: string }, p: SearchParams): string`, giving `/club/<encoded id>?platform=…&date=…&from=…&to=…&forMinutes=…`.

- [ ] **Step 1: Write the failing tests.**
  - `clubHref` for a `twojtennis` uuid id and for an id with a space (encoded); the result parses back through `parseClubSearch`.
  - `ClubPageContent` (`next/navigation` and `CalendarPanel` mocked, `fetch` stubbed, `QueryClientProvider` around it):
    - club in the response: its name is rendered and `CalendarPanel` receives the window from the URL.
    - `?platform=tenis4u` with no `from`/`to`: the fetch URL has `from=07:00&to=23:00` and the panel gets `window: null`.
    - `from=99:99&to=abc`: same as no window, no throw (Review Focus 4).
    - club missing from the response: shows `Nie znaleziono wolnych terminów dla tego klubu`.
    - unknown or missing `platform`: shows `Nieprawidłowy link` and does not call `fetch`.
    - fetch failure: shows an error message, not a blank page.
    - the back link reads `← Wyniki` with `href` `/?date=…&from=…&to=…&forMinutes=…` when a window is present and `/` when not.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement.** `ClubPageContent` reads `useParams` and `useSearchParams`, matches the club by `platform` and `id`, and while loading shows the compact skeleton. It passes the back link as `CalendarPanel`'s `leading`.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Commit** `feat: mobile club calendar page`.

---

### Task 8: Two-column home page

**Files:**
- Create: `src/features/club/components/ResultsView.tsx`, `src/features/search/components/SearchPage.tsx`, `src/hooks/use-media-query.ts`
- Modify (rewrite): `src/app/page.tsx` (a `Suspense` around `SearchPage`); modify `src/app/globals.css`
- Test: `src/__tests__/results-view.test.tsx` (jsdom)

**Interfaces:**
- Consumes: everything above.
- Produces: `useMediaQuery(query: string): boolean` (built on `useSyncExternalStore`, `false` on the server); `ResultsView({ params: SearchParams })`; `SearchPage()` (reads `useSearchParams`, searches with `router.replace('/?' + toQueryString(p))`, passes `initial` to `SearchForm`, gives `ResultsView` a `key` of the query string so selection resets on a new search).

- [ ] **Step 1: Write the failing tests** (fetch stubbed with two clubs; `usePreferences`, `useRecordBookingClick`, `useFavoritesSaveError` and `StarButton` mocked; `next/navigation` mocked):
  - desktop (`matchMedia` matches `(min-width: 1024px)`): before any click the empty-state text is shown; clicking a card shows that club's calendar panel (club name in the panel header) and marks the card `aria-current`; clicking the other card swaps the panel; two clubs with the same `id` on different platforms select independently.
  - mobile (`matchMedia` does not match): clicking a card calls `router.push` with `clubHref(club, params)` and renders no panel.
  - an empty result shows `Brak dostępnych kortów w wybranym terminie.`; a failed fetch shows `Błąd podczas wyszukiwania. Spróbuj ponownie.`; while loading the skeleton is shown.
- [ ] **Step 2: Run** `npx vitest run src/__tests__/results-view.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Layout: `main` is `min-h-svh lg:h-svh flex flex-col`; the results region is `min-h-0 flex-1` and, from `lg`, a grid `grid-cols-[300px_1fr]` with the list scrolling inside its column and the right column holding `CalendarEmptyState` or `<CalendarPanel key={clubKey} …/>`. Below `lg` only the list shows (hide the right column with `hidden lg:block`). Add to `globals.css` a `@keyframes calendar-panel-in { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: none } }` and `.calendar-panel-in { animation: calendar-panel-in 300ms ease }`, disabled under `prefers-reduced-motion: reduce`. The header keeps the title, tagline and `AccountButton`, but drops the 760px centering so the two columns can use the full width. `ErrorBoundary` is no longer used by the page (leave the file).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: all PASS, no errors.
- [ ] **Step 5: Verify in the browser** (dev server via `.claude/launch.json`, then `preview_start`). At desktop width: search, see the two-column layout, click a card and confirm the panel animates in, the window rows are blue, and `document.querySelector('[data-testid="calendar-scroll"]').scrollTop > 0` for a window starting after 08:00; click a green cell and confirm a new tab opens at the booking URL. At 375px width: tap a card, land on `/club/…`, tap `← Wyniki` and see the same results without a new search click. Reload `/?date=…` and see the results restored.
- [ ] **Step 6: Commit** `feat: two-column results layout with URL-driven search`.

---

### Task 9: PWA manifest

**Files:**
- Create: `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`
- Modify: `src/app/layout.tsx` (export `viewport` with `themeColor`)
- Test: `src/__tests__/manifest.test.ts`

**Interfaces:**
- Produces: default export of `manifest.ts` returning `MetadataRoute.Manifest`.

- [ ] **Step 1: Write the failing test** `manifest has the install fields`: `name === 'Korty Kraków'`, `short_name` is set, `start_url === '/'`, `display === 'standalone'`, `theme_color` and `background_color` are set, and `icons` contains a 512×512 entry and a 192×192 entry.
- [ ] **Step 2: Run** `npx vitest run src/__tests__/manifest.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `manifest.ts`. Generate the icons with `ImageResponse` (`next/og`): `icon.tsx` 512×512 and `apple-icon.tsx` 180×180, a green tile with a tennis-ball glyph, so there are no binary files to commit. List the icon routes in the manifest `icons`.
- [ ] **Step 4: Run** `npx vitest run`, then `npm run build`. Expected: tests PASS; the build lists `/manifest.webmanifest`, `/icon` and `/apple-icon`. Then start the production server and run `curl -s localhost:3000/manifest.webmanifest`. Expected: JSON with the fields above. Confirm in Chrome DevTools, Application tab, Manifest, that the icons load and no installability error is listed.
- [ ] **Step 5: Commit** `feat: add web app manifest and icons for Add to Home Screen`.

---

## Final check

- [ ] Run `npm test && npm run lint && npm run build`. Expected: all green.
- [ ] Open the app signed out, then signed in, and confirm that the star toggles in the card and in the panel stay in sync, and that the last booked court is the first column after a green-cell click.
