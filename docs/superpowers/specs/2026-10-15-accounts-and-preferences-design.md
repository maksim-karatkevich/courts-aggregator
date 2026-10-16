# Accounts, Favorites & Personal Ranking

**Date:** 2026-10-15
**Status:** Draft, awaiting review
**Builds on:** [UX redesign spec](2026-10-13-ux-redesign-design.md) (the star icon, results list and calendar panel come from there)

## Goal

Let players sign in so the app remembers what they like:

- **Favorites** (⭐) they pick themselves, saved to their account and available on any device.
- **Booking history**: every time they click "Zarezerwuj", we remember that club (and court). Next time, clubs they booked recently show up first.

The project is also a learning exercise in building a real backend: sign-in, a database, migrations, hosting. Choices favor understanding how things work over hiding them in paid services, as long as running costs stay near zero.

---

## 1. Decisions at a glance

| Topic | Decision |
|---|---|
| Who uses it | Other players too, not only the author |
| Sign-in | Optional. Search and calendar work for everyone. |
| Sign-in method | Google only (free, no passwords to store) |
| Auth library | Better Auth, running inside the Next.js app |
| Database | Neon Postgres (free plan) |
| Database layer | Drizzle |
| Hosting | Vercel Hobby (free) |
| Favorites when signed out | Kept in the browser (`localStorage`) |
| Favorites when signed in | Kept on the server; merged once at sign-in |
| Booking history | Signed-in users only |
| What counts as "booked" | Clicking "Zarezerwuj" (we can't see the real booking on tenis4u / twojtennis) |
| Ranking rule | Most recently booked club first, then most free slots |
| Ranking labels | None. `Wszystkie wyniki` is silently re-ordered; booked clubs get no label or section of their own. |

---

## 2. What the user sees

### Signed out

- Search, results and calendar work as in the UX redesign.
- ⭐ works and is saved **in this browser only**.
- Results order: favorites section, then all other clubs by **most free slots in the search window**.
- "Zarezerwuj" opens the booking site; nothing is remembered.
- Header shows a **"Zaloguj się"** button.

### Signed in

- Header shows the Google avatar. Its menu has **"Wyloguj"** (sign out) and **"Usuń konto"** (delete account, with a confirm step).
- ⭐ is saved to the account and shows on every device.
- Results order uses booking history (section 3).
- In the calendar, the court the user booked last at that club is the **first column**.

### Comparison

| | Signed out | Signed in |
|---|---|---|
| Search and calendar | ✅ | ✅ |
| ⭐ Ulubione | ✅ this browser only | ✅ all devices |
| Recently booked clubs first | ❌ | ✅ |
| Last booked court as first calendar column | ❌ | ✅ |

---

## 3. How results are ordered

The results list has two parts:

1. **`⭐ Ulubione`**: favorite clubs that appear in this search
2. **`Wszystkie wyniki`**: everything else (the heading from the UX redesign). Booked clubs are not labeled; they just move up.

Both parts use the same comparison rule. For two clubs A and B:

1. If only one was booked before, it comes first.
2. If both were booked, the more **recently** booked one comes first.
3. If neither was booked, the one with **more free slots in the search window** comes first.
4. If still tied, sort alphabetically by club name, so the order never jumps randomly.

Clubs not in the search results (nothing free in the window) never appear, even if they are favorites or were booked before.

The sorting runs in the browser. It is a plain function with no database or React code (like `slot-filter.ts`), so it can be unit tested on its own.

### Example

Search 13:00 – 17:00. Sport Factory is a favorite. Korty Hera was booked on 12 Oct and TCC Sport on 30 Sep.

| Club | Favorite | Last booked | Free slots |
|---|---|---|---|
| Sport Factory | ⭐ | – | 2 |
| Korty Hera | | 12 Oct | 1 |
| TCC Sport | | 30 Sep | 6 |
| Wiosna | | – | 5 |
| Bulwary | | – | 3 |

Signed-in user sees:

```
⭐ Ulubione
  Sport Factory
Wszystkie wyniki
  Korty Hera      (booked most recently)
  TCC Sport       (booked earlier)
  Wiosna          (5 free slots)
  Bulwary         (3 free slots)
```

Signed-out user (no favorites) sees: TCC Sport, Wiosna, Bulwary, Sport Factory, Korty Hera, ordered only by free slots.

---

## 4. Favorites: browser + account

There is always **one source of truth**, so nothing can get out of sync:

| Moment | What happens |
|---|---|
| Signed out | Favorites live in `localStorage` only. |
| Signing in | **One-time merge:** favorites from `localStorage` are added to the account (never removed). Then `localStorage` is replaced with the account's list. |
| Signed in | **The server is the truth.** `localStorage` is only a quick-load copy so stars appear instantly; the server's answer overwrites it. Every star / unstar goes to the server. |
| Signing out | `localStorage` favorites are cleared, so the next person on a shared computer doesn't see them. |

We deliberately do **not** do two-way syncing. With two devices each keeping their own copy, a favorite removed on one device can come back from the other. Avoiding that properly needs a lot of extra machinery; merging once at sign-in avoids the problem entirely.

Club identity everywhere is the pair **platform + club ID** (written `tenis4u:103`), because the two platforms each have their own IDs, which could clash.

---

## 5. Booking history

- Recorded only for signed-in users.
- Saved when the user clicks **"Zarezerwuj"**: either a green calendar cell (we know the court) or the header button (we only know the club).
- **Opening a club does not count.** Only booking intent does.
- We keep **one row per user and club**: when they last clicked, and which court. A new click updates that row; nothing grows forever.
- If a click has no court (header button), the previously saved court is kept.
- The booking site opens immediately. Saving the click happens in the background and must never delay it.

---

## 6. How the pieces fit

```
Browser
  ├─ GET  /api/search?...          public, cached (unchanged, knows nothing about users)
  ├─ GET  /api/me/preferences      favorites + booking history
  ├─ PUT  /api/me/favorites/{platform}/{clubId}       add a favorite
  ├─ DELETE /api/me/favorites/{platform}/{clubId}     remove a favorite
  ├─ POST /api/me/favorites/merge  one-time merge at sign-in
  ├─ POST /api/me/booking-clicks   record a "Zarezerwuj" click
  ├─ DELETE /api/me                delete account
  └─ /api/auth/*                   Better Auth (Google sign-in, sessions)
                     │
                Neon Postgres
```

- **Search stays public.** Results are the same for everyone, which is what lets the server cache them. Personal data comes from a separate request, and the browser combines the two.
- Everything under `/api/me/*` requires sign-in and returns **401** otherwise.
- **The user is always taken from the session, never from the request.** A request can't say "I am user X"; the server knows from the session cookie.
- Inputs are checked (zod): `platform` must be `tenis4u` or `twojtennis`; `clubId` and `court` are short strings. Anything else returns **400**.
- Add and remove favorite are separate requests rather than one "toggle", so a double click or retry can't flip the state back.
- The frontend uses React Query (already in the project):
  - Preferences load once per session, and only when signed in.
  - Starring updates the UI immediately and reverts if the server fails.

---

## 7. Data

Four tables come from Better Auth: `user`, `session`, `account`, `verification`. There is no password column; Google handles that.

Our two tables:

**`favorite`**

| Column | Notes |
|---|---|
| `user_id` | → `user.id`, deleted with the user |
| `platform` | `tenis4u` or `twojtennis` |
| `club_id` | text |
| `created_at` | timestamp |

Primary key `(user_id, platform, club_id)`, so the same club can't be starred twice.

**`booking_preference`**

| Column | Notes |
|---|---|
| `user_id` | → `user.id`, deleted with the user |
| `platform` | `tenis4u` or `twojtennis` |
| `club_id` | text |
| `last_court_name` | text, optional |
| `last_clicked_at` | timestamp |

Primary key `(user_id, platform, club_id)`. A click is a single **upsert**: insert the row, or update it if it already exists.

Our app data is kept out of Better Auth's `user` table on purpose: that table belongs to the library, and separate tables keep each kind of data easy to query and update safely.

---

## 8. Sign-in flow

1. The user clicks "Zaloguj przez Google". Our server sends them to Google.
2. They approve on Google's own page. Our app never sees their Google password.
3. Google sends them back with a one-time code.
4. Our server swaps the code (plus our secret) with Google for name, email and avatar.
5. Better Auth saves the user and a session in the database, and gives the browser a session cookie that JavaScript can't read.
6. Every later request carries the cookie; the server looks up the session to know who it is.

Setup done by hand: create an OAuth client in Google Cloud Console, with callback addresses for localhost and for the production domain.

Secrets go in `.env.local` locally and in Vercel settings for production, never in git: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

---

## 9. Database, migrations and hosting

- **Two Neon branches:** `dev` for local work, `main` for the live app. Mistakes while developing never touch real users' data.
- **Tables are described in TypeScript** (Drizzle). Changes produce small SQL migration files that are committed to git and applied to `dev` first, then `main`. Every environment ends up with the same tables.
- Database code is server-only and can never be bundled into the browser.
- **Hosting:** Vercel Hobby, deploying automatically from GitHub. Hobby is for non-commercial use; if the app ever earns money, it moves to Pro ($20/month).

---

## 10. Privacy

- Stored: name, email, avatar, favorites and booking clicks. Better Auth also stores the Google sign-in tokens (encrypted) and, per session, the IP address and browser user agent. Nothing more.
- **"Usuń konto"** deletes the user. Their favorites, booking history and sessions are removed automatically with them (the database deletes rows that point at a deleted user).
- The app is used in the EU, where users have the right to have their data deleted; building it in now is much easier than adding it later.

---

## 11. When things go wrong

The rule: **personal features may fail, search must never fail.**

| What breaks | What the user sees |
|---|---|
| Database down or slow | Search works without personal ordering. A small note: "Nie udało się wczytać ulubionych". |
| Starring fails | The star reverts, with a short "Spróbuj ponownie". |
| Saving a booking click fails | Nothing. The booking site opens anyway; that click is lost. |
| Session expired | Shown as signed out. Favorites return after signing in again. |
| Google sign-in cancelled | Back on the page, still signed out. |

---

## 12. Testing

1. **Ordering rules (unit tests):**
   - booked beats not booked
   - newer booking beats older
   - more free slots first
   - alphabetical tie-break
   - favorites go into their own section
   - clubs missing from the search never appear
2. **Favorites merge (unit tests):** local + server lists combine without duplicates and never lose server favorites.
3. **Endpoints (tests against the `dev` database):**
   - 401 when signed out
   - 400 on bad input
   - a user only ever reads or changes their own rows
   - repeat clicks update the same row
   - a click without a court keeps the previous court
   - deleting the account removes all of the user's rows
4. **Google sign-in (by hand):** once locally, once on the live site.

---

## 13. Out of scope

- Sign-in methods other than Google (email + password could be a later learning exercise)
- Booking history for signed-out users
- Labels explaining the order ("rezerwowałeś tu 3×")
- Weighting by number of bookings, or any recommendation scoring
- Two-way favorites sync between devices
- Seeing whether a booking actually went through on the booking platform
