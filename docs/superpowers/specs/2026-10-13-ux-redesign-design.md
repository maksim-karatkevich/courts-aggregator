# UX Redesign — Search, Results, Calendar & Favorites

**Date:** 2026-10-13  
**Status:** Approved for implementation

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
- Available slot count + earliest–latest time range
- Star icon to toggle favorite
- Chevron `›` that turns blue when selected

Clicking a card marks it selected (blue left border, dark blue tint) and triggers the calendar panel to open on the right.

**Right column (flex, fills remaining width):**
- Before any card is clicked: empty state — dashed border, calendar icon, "Wybierz klub z listy, aby zobaczyć dostępne terminy"
- After a card is clicked: the calendar panel animates in (`translateX(20px) → 0`, `opacity 0 → 1`, 300ms ease). Clicking a different card re-runs the animation with the new club's data.

---

## 3. Calendar Panel

The calendar panel shows all courts for the selected club as a grid:

- **Rows:** Time slots (e.g. 13:00, 14:00, … 19:00) matching the search window
- **Columns:** Up to 7 courts, each with name and surface type in the header
- **Cells:** Green (`wolny`) if available, dark empty if taken
- Clicking a green cell opens the club's booking URL in a new tab

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
- Same court × time slot grid, horizontally scrollable

No split view on mobile — screen is too narrow to fit both panels.

---

## 5. Favorites

Favorites are stored in `localStorage` under a single key (e.g. `favClubIds`), as a JSON array of club IDs. No login required.

Behavior:
- Star icon on each club card (results list and calendar header) toggles favorite status
- Favorited clubs always appear at the top of results under `⭐ Ulubione`, separated from the rest by a divider
- Favorites persist across sessions and survive page refresh
- If a favorited club has no availability on the searched date, it is hidden from the favorites section (not shown with zero slots)

---

## 6. Data Considerations

The existing `/api/search` endpoint returns `ClubResult[]` with `slots: TimeSlot[]` per club. The calendar grid needs slots grouped by court (`courtName`) and by start time. This grouping already exists in `ClubList.tsx` (`groupByCourt`). The same logic moves into the calendar panel component.

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
- Authentication or user accounts
