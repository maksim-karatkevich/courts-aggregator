# UX Redesign — Search, Results, Calendar & Favorites

**Date:** 2026-10-13  
**Status:** Approved for implementation  
**Revised:** 2026-10-13: the calendar shows the club's full day, and `/api/search` returns full-day slots (sections 3, 4, 6)  
**Revised:** 2026-10-15: favorites storage and user accounts are defined in the accounts & preferences spec (sections 5, 8)

## Overview

Redesign the court search UI to be more usable on both desktop and mobile. The core flow stays the same (search by date + time → see available courts → go to booking site), but the results presentation changes significantly: compact club cards on the left, a full court calendar grid on the right, and a favorites system pinned to the top.

---

## 1. Search Form

The existing horizontal form stays. Three improvements:

**Date quick-picks.** Add chip buttons above or beside the date picker: `Today`, `Tomorrow`, `This Weekend`. Tapping one sets the date immediately without opening the calendar popover. These cover the majority of real searches.

**Duration selector.** Add a `Czas gry` (game duration) field with three options: 60 min, 90 min, 120 min. This maps directly to the existing `forMinutes` param in `SearchParams` which is currently hardcoded to 60.

**Time dropdowns.** Reduce visual noise in the From/To selects. Instead of 30-minute slots from 06:00–23:00 (34 items), offer 1-hour steps by default with a "more options" affordance, or group slots visually (morning / afternoon / evening). The goal is fewer taps to reach a common time like 14:00.

---

## 2. Results Layout — Desktop

Desktop uses a **two-column layout** that fills the viewport height below the search strip.

**Left column (300px fixed):** Scrollable list of club cards. Two sections separated by a divider:
1. `⭐ Ulubione` — favorited clubs, shown first, gold left border
2. `Wszystkie wyniki` — all clubs from the search, green or orange left border by platform

Each card shows:
- Club name + surface/court count summary
- Available slot count + earliest–latest time range, counted **within the search window only**
- Star icon to toggle favorite
- Chevron `›` that turns blue when selected

Clicking a card marks it selected (blue left border, dark blue tint) and triggers the calendar panel to open on the right.

**Right column (flex, fills remaining width):**
- Before any card is clicked: empty state — dashed border, calendar icon, "Wybierz klub z listy, aby zobaczyć dostępne terminy"
- After a card is clicked: the calendar panel animates in (`translateX(20px) → 0`, `opacity 0 → 1`, 300ms ease). Clicking a different card re-runs the animation with the new club's data.

---

## 3. Calendar Panel

The calendar panel shows all courts for the selected club as a grid covering the **club's full day**, not just the search window:

- **Rows:** One per hour, 07:00 – 22:00 (the last row is 22:00 – 23:00)
- **Columns:** Up to 7 courts, each with name and surface type in the header
- **Cells:** Green (`wolny`) if the court is free for that whole hour, dark empty if taken
- Clicking a green cell opens the club's booking URL in a new tab

**Search window highlight.** Rows inside the searched window (e.g. 13:00 – 16:00 for a 13:00 – 17:00 search) get a light blue background, blue time labels, and a thin blue line above the first and below the last window row. A legend under the header shows `wolny`, `zajęty` and `Twoje okno 13:00 – 17:00`.

**Initial scroll.** The grid scrolls vertically inside the panel. When it opens, it is scrolled so the hour before the window is the first visible row, with the window directly below it. The rest of the day is reachable by scrolling, with no toggle.

**Why the full day:** the results list already filters by the window, so clubs with nothing in it never appear. Opening a club signals interest in that club, so free courts just outside the window (e.g. 17:00 or 18:00) are useful, not noise.

Mockup: `.superpowers/mockups/calendar-time-range.html`

Panel header:
- Club name (large, bold)
- Subtitle: platform + date + instruction hint
- Favorite star button (mirrors the card's star, synced)
- `Zarezerwuj →` button — links to booking URL

The grid is horizontally scrollable if courts overflow the panel width.

---

## 4. Results Layout — Mobile

Single-column layout. Same card design as desktop (compact, star icon, slot count).

Tapping a card navigates to a dedicated calendar page (`/club/[id]`). This page shows:
- Back button (`← Wyniki`) that returns to the search results
- Club name + date in the header
- `Zarezerwuj →` button
- Same court × time slot grid (full day, window highlighted, same initial scroll), horizontally scrollable

The search params travel in the URL (`/club/[id]?date=…&from=…&to=…&forMinutes=…`). The page calls `/api/search` with them and picks this club from the response. Without `from`/`to` (e.g. opened from a shared link), it searches the full day for `date` (default today) and highlights nothing.

No split view on mobile — screen is too narrow to fit both panels.

---

## 5. Favorites

Star icon on each club card (results list and calendar header) toggles favorite status. Favorited clubs appear at the top of results under `⭐ Ulubione`. A favorite with no availability on the searched date is hidden, not shown with zero slots.

Storage and syncing (browser for signed-out users, account for signed-in users) are defined in the [accounts & preferences spec](2026-10-15-accounts-and-preferences-design.md).

---

## 6. Data Considerations

The server already fetches and caches each club's **full day** from tenis4u and twojtennis; the search window is applied afterwards in our own code (`slot-filter.ts`). Today `/api/search` returns only the slots clipped to the window, so the browser never sees the rest of the day. The calendar needs that rest.

**Change:** `ClubResult` gets a second slot list:

```ts
interface ClubResult {
  // …existing fields
  slots: TimeSlot[]     // clipped to the search window and duration (unchanged)
  daySlots: TimeSlot[]  // all free spans for the date, not clipped, no duration filter
}
```

- **Which clubs are returned** doesn't change: a club is included only if `slots` is non-empty, i.e. it has something free in the window.
- The **results list and card counts** use `slots`.
- The **calendar** uses `daySlots`. A cell (court × hour) is free if some span for that court covers the whole hour. Grouping by court reuses the `groupByCourt` logic from `ClubList.tsx`, moved into the calendar component.
- The highlight comes from the search params (`from`, `to`), not from the data.

This is one request per search, and opening a club needs no extra request, so the calendar appears instantly. Fetching and caching are unchanged; only what the filter step returns grows. The response only gets bigger for clubs already in the list.

No new API endpoints needed for this redesign.

---

## 7. PWA

`next-pwa` is added to enable "Add to Home Screen" on mobile. Requires:
- `manifest.json` — app name, icon, theme color
- Service worker via `next-pwa` config — cache strategy for static assets

This is a thin layer on top of the existing Next.js app, not a separate build target.

---

## 8. Out of Scope

- Slot availability alerts / push notifications
- Telegram or WhatsApp bot
- In-app booking (no platform credentials)
- Authentication or user accounts: moved to the [accounts & preferences spec](2026-10-15-accounts-and-preferences-design.md)
