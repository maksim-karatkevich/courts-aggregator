# Accounts, Favorites & Personal Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optional Google sign-in, plus favorites and booking history that re-order the search results, without ever breaking the public search.

**Architecture:**
- `/api/search` stays public and cached, unchanged.
- A separate personal layer adds:
  - Better Auth (Google) under `/api/auth/*`
  - Four `/api/me/*` routes backed by a small repository module over Neon Postgres (Drizzle)
  - Client hooks that merge preferences with search results through a pure ranking function
- Favorites live in `localStorage` while signed out, are merged once at sign-in, then the server is the source of truth.

**Tech Stack:** Next.js 16 (App Router), Better Auth, Drizzle ORM + drizzle-kit, Neon (`@neondatabase/serverless`), PGlite (tests only), zod, React Query (already installed), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-accounts-and-preferences-design.md` (read it with this plan).

**Learning mode:** the user is building this project to learn. At the end of each task, the implementer writes 2–4 plain-language sentences in the task report: what was built, why it is done this way, one alternative. No jargon without a one-line explanation.

## Scope note: built against today's UI

The UX redesign (two-column layout, calendar panel) is **not built yet**. This plan wires everything into the **current** `ClubList`:
- Court rows inside each club card play the role of calendar columns. "Last booked court first" is applied to them through `orderCourts()`.
- Each slot chip becomes a booking link. Clicking it is the equivalent of the spec's "green cell" click, which records the court.

When the redesign plan is written, its calendar consumes the same `orderCourts()`, `useRecordBookingClick()` and `useFavorites()` from this plan.

## Deviations from the spec (flag these to the user at review)

1. **Endpoint tests use PGlite, not the Neon `dev` branch.** PGlite is real Postgres running inside the test process: no network, a fresh database per test, free. The Neon `dev` branch is still used for local development and manual checks.
2. **Account deletion uses Better Auth's built-in `deleteUser`** instead of a custom `DELETE /api/me`. Same behavior: the user row is deleted, and our tables cascade.
3. **"Free slots in the window" = `club.slots.length`**, the number of free spans already clipped to the window by `/api/search`.

## Global Constraints

- **Sign-in:** Google only. Search and calendar work without signing in.
- **Platforms:** exactly `tenis4u` and `twojtennis`, from `Platform` in `src/lib/types.ts`.
- **Club key:** `` `${platform}:${clubId}` ``, e.g. `tenis4u:103`. Parse by splitting on the **first** `:`.
- **localStorage:** key `favClubIds`, value is a JSON array of club keys. Every read and write is wrapped in try/catch, and failure counts as an empty list.
- **Identity:** the user id always comes from the Better Auth session on the server, never from the request body or URL.
- **Status codes:** `/api/me/*` returns 401 when signed out and 400 on invalid input. Successful writes return 204, except merge, which returns 200 with JSON.
- **Secrets:**
  - Names: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
  - Locally they go in `.env.local` (already gitignored); in production, in Vercel settings. Never commit them.
- **Database code** (`src/db/index.ts`, `src/lib/auth.ts`) starts with `import 'server-only'`.
- **Booking links:** the booking site always opens immediately. Recording the click never blocks or delays it.
- **Personal features may fail; search must never fail.**
- **Copy (Polish, exact):**
  - Buttons and headings: `Zaloguj się`, `Wyloguj`, `Usuń konto`, `★ Ulubione`, `Wszystkie wyniki`
  - Errors: `Nie udało się wczytać ulubionych`, `Nie udało się zapisać. Spróbuj ponownie.`
  - Delete confirmation: `Usunąć konto? Ulubione i historia rezerwacji zostaną trwale usunięte.` with buttons `Usuń` / `Anuluj`

## Review Focus

1. **Preferences fail to load for a signed-in user.** The list still renders in the default order (most slots, then name) and shows `Nie udało się wczytać ulubionych`. Test: `rankClubs(clubs, EMPTY_PREFERENCES)` (Task 5).
2. **Broken or blocked localStorage** (garbage JSON, a non-array, a throwing `getItem` in private mode). Treated as no favorites, no crash. Tests in Task 6.
3. **Favorites or booked clubs that aren't in today's results.** They never appear and don't break the sort. Test in Task 5.
4. **Merge called with junk** (more than 200 keys, a malformed key, an unknown platform). Rejected with 400 and nothing written. Test in Task 4.
5. **A user only touches their own rows.** User B's favorites and bookings never appear in user A's preferences or change through A's calls. Test in Task 3.

---

### Task 1: 👤 Accounts and secrets (done by the user, guided)

The executor cannot create accounts. The user does these steps; the executor gives instructions and verifies at the end.

**Files:**
- Create: `.env.local` (gitignored, never committed)
- Create: `.env.example` (committed, names only)

- [ ] **Step 1 (user): Neon.** Create a free project at neon.tech, region `aws-eu-central-1` (Frankfurt, closest to Kraków). In the project, create a branch `dev` from `main`. Copy the **`dev`** branch's pooled connection string.
- [ ] **Step 2 (user): Google OAuth client.**
  - In Google Cloud Console, create a project, then go to **APIs & Services → OAuth consent screen**: External, app name `Korty Kraków`, scopes `email` and `profile`.
  - Go to **Credentials → Create OAuth client ID**: type Web application. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
  - Copy the client ID and secret.
- [ ] **Step 3 (user): `.env.local`.** Fill in:
  - `DATABASE_URL`: the dev branch string
  - `BETTER_AUTH_SECRET`: the output of `openssl rand -base64 32`
  - `BETTER_AUTH_URL`: `http://localhost:3000`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] **Step 4 (executor): create `.env.example`** with the five names and empty values.
- [ ] **Step 5 (executor): verify.**
  - Run `git check-ignore .env.local`. Expected output: `.env.local`.
  - Run `node -e "require('fs').readFileSync('.env.local','utf8').split('\n').filter(Boolean).forEach(l=>console.log(l.split('=')[0], l.split('=')[1]?.length>0))"`. Expected: all five names print `true`. This never prints the values.
- [ ] **Step 6: Commit.** `git add .env.example && git commit -m "chore: document auth and database env vars"`

---

### Task 2: Database schema, Better Auth wiring, first migration

**Files:**
- Modify: `package.json`
  - Dependencies: `better-auth`, `drizzle-orm`, `@neondatabase/serverless`, `zod`, `server-only`
  - Dev dependencies: `drizzle-kit`, `@electric-sql/pglite`, `dotenv`
  - Scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`
- Create: `drizzle.config.ts`
- Create: `src/db/auth-schema.ts` (generated by the Better Auth CLI)
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `drizzle/` (generated migration SQL)
- Create: `src/__tests__/helpers/test-db.ts`
- Test: `src/__tests__/db-schema.test.ts`

**Interfaces:**
- Produces:
  - `src/db/schema.ts` exports:
    - everything from `auth-schema.ts` (`user`, `session`, `account`, `verification`)
    - `favorite` and `bookingPreference` tables
    - `type Db = PgDatabase<PgQueryResultHKT, typeof schema>`, which both the Neon and PGlite clients satisfy
  - `src/db/index.ts` exports `db: Db`, built with `drizzle-orm/neon-http`.
  - `src/lib/auth.ts` exports `auth`:
    - `betterAuth({ database: drizzleAdapter(db, { provider: 'pg', schema }), socialProviders: { google: {...} }, user: { deleteUser: { enabled: true } }, plugins: [nextCookies()] })`
  - `src/app/api/auth/[...all]/route.ts`: `export const { GET, POST } = toNextJsHandler(auth)`
  - `src/__tests__/helpers/test-db.ts`:
    - `createTestDb(): Promise<Db>`: a fresh PGlite with all migrations from `drizzle/` applied
    - `insertUser(db: Db, id: string): Promise<void>`: inserts a minimal `user` row

**Tables in `schema.ts`.** Columns are snake_case in SQL and camelCase in TypeScript.

- `favorite`
  - `user_id` text, FK to `user.id`, **on delete cascade**
  - `platform` text, not null
  - `club_id` text, not null
  - `created_at` timestamp, not null, default now
  - Primary key: `(user_id, platform, club_id)`
- `booking_preference`
  - `user_id` text, FK to `user.id`, on delete cascade
  - `platform` text, not null
  - `club_id` text, not null
  - `last_court_name` text, nullable
  - `last_clicked_at` timestamp, not null
  - Primary key: `(user_id, platform, club_id)`

- [ ] **Step 1: Install the packages.** Add the scripts listed in **Files** above.
- [ ] **Step 2: Write `drizzle.config.ts`.**
  - Load `.env.local` with `dotenv`.
  - Settings: `dialect: 'postgresql'`, `schema: './src/db/schema.ts'`, `out: './drizzle'`, `dbCredentials.url` from `DATABASE_URL`.
- [ ] **Step 3: Write `src/db/index.ts` and `src/lib/auth.ts`** as described in Interfaces. Then generate the auth tables:
  - Run `npx @better-auth/cli@latest generate --config src/lib/auth.ts --output src/db/auth-schema.ts`.
  - Expected: a file defining `user`, `session`, `account` and `verification`.
  - If the CLI name has changed, use the generate command from the current Better Auth docs. The output must still be a Drizzle schema with those four tables.
- [ ] **Step 4: Write `src/db/schema.ts`** with the two tables above, plus `export * from './auth-schema'` and the `Db` type.
- [ ] **Step 5: Generate the migration.**
  - Run `npm run db:generate`.
  - Expected: a new `drizzle/0000_*.sql` creating all six tables, with `ON DELETE cascade` on both of our foreign keys. Read the SQL before continuing.
- [ ] **Step 6: Write the failing test** `src/__tests__/db-schema.test.ts`.
  - `it('applies migrations to a fresh database')`: `createTestDb()` resolves, and `select count(*) from favorite` returns 0.
  - `it('deletes a user's favorites and booking preferences with the user')`:
    1. `insertUser(db, 'u1')`
    2. Insert one `favorite` and one `bookingPreference` for `u1`
    3. Delete the `user` row
    4. Both tables now have 0 rows for `u1`
- [ ] **Step 7: Run it.** `npx vitest run src/__tests__/db-schema.test.ts`. Expected: FAIL, because `helpers/test-db` doesn't exist yet.
- [ ] **Step 8: Implement `src/__tests__/helpers/test-db.ts`.**
  - Create the client with `new PGlite()`, then `drizzle(client, { schema })` from `drizzle-orm/pglite`.
  - Apply migrations with `migrate(db, { migrationsFolder: 'drizzle' })` from `drizzle-orm/pglite/migrator`.
- [ ] **Step 9: Run it.** `npx vitest run src/__tests__/db-schema.test.ts`. Expected: 2 passed.
- [ ] **Step 10: Apply the migration to Neon `dev`.**
  - Run `npm run db:migrate`. Expected: finishes without errors.
  - Then run `npm run dev` and open `http://localhost:3000/api/auth/get-session`. Expected: `null` with HTTP 200. That means the auth route is live.
- [ ] **Step 11: Check the build.** `npx tsc --noEmit && npm test`. Expected: no type errors, all tests pass.
- [ ] **Step 12: Commit.**
  ```bash
  git add package.json package-lock.json drizzle.config.ts drizzle src/db src/lib/auth.ts "src/app/api/auth" src/__tests__/helpers src/__tests__/db-schema.test.ts
  git commit -m "feat: add Neon/Drizzle schema and Better Auth with Google"
  ```

---

### Task 3: Preferences repository

**Files:**
- Create: `src/features/account/types.ts`
- Create: `src/features/account/server/repo.ts`
- Test: `src/__tests__/account-repo.test.ts`

**Interfaces:**
- Consumes: `Db`, `favorite`, `bookingPreference` (Task 2); `createTestDb`, `insertUser` (Task 2)
- Produces, in `types.ts`, with no server imports:
  ```ts
  export type ClubRef = { platform: Platform; clubId: string }
  export type BookedClub = { club: string; lastClickedAt: string; lastCourt: string | null } // club = club key, lastClickedAt = ISO string
  export type Preferences = { favorites: string[]; booked: BookedClub[] }               // favorites = club keys
  export const EMPTY_PREFERENCES: Preferences
  export function clubKey(ref: ClubRef): string
  export function parseClubKey(key: string): ClubRef | null  // null if there's no ':', the platform is unknown, or the id is empty
  ```
- Produces, in `repo.ts`:
  ```ts
  getPreferences(db: Db, userId: string): Promise<Preferences>
  addFavorite(db: Db, userId: string, ref: ClubRef): Promise<void>        // does nothing if already starred
  removeFavorite(db: Db, userId: string, ref: ClubRef): Promise<void>
  mergeFavorites(db: Db, userId: string, refs: ClubRef[]): Promise<string[]> // returns all favorites after the merge
  recordBookingClick(db: Db, userId: string, ref: ClubRef, court: string | null, at?: Date): Promise<void>
  ```

- [ ] **Step 1: Write the failing tests** in `src/__tests__/account-repo.test.ts`. Use a fresh `createTestDb()` per test, with users `u1` and `u2`.
  - `parseClubKey`:
    - `parseClubKey('tenis4u:103')` returns `{ platform: 'tenis4u', clubId: '103' }`
    - `parseClubKey('twojtennis:a:b')` returns clubId `'a:b'`
    - `'foo:1'`, `'tenis4u:'` and `'tenis4u'` all return `null`
  - `addFavorite`: adding the same club twice leaves exactly 1 row.
  - `removeFavorite`: removes only that club.
  - `mergeFavorites`:
    - `u1` has `[tenis4u:103]`. Merging `[tenis4u:103, twojtennis:abc]` returns both, with no duplicates.
    - Merging `[]` returns the existing list unchanged. Existing server favorites are never lost.
  - `recordBookingClick`:
    - Two clicks on the same club leave 1 row, with `lastClickedAt` equal to the second click's `at`.
    - Click with `'Kort 2'`, then a click with `null`: `lastCourt` is still `'Kort 2'`.
  - `getPreferences` (Review Focus 5):
    - `u2`'s favorites and bookings never appear in `u1`'s results.
    - `booked` is ordered newest first.
- [ ] **Step 2: Run it.** `npx vitest run src/__tests__/account-repo.test.ts`. Expected: FAIL, the modules don't exist yet.
- [ ] **Step 3: Implement `types.ts` and `repo.ts`.**
  - `addFavorite` and `mergeFavorites` use `onConflictDoNothing()`. Merge is one bulk insert, skipped when `refs` is empty.
  - `recordBookingClick` is a single upsert that keeps the old court when the new one is null:
    ```ts
    .onConflictDoUpdate({
      target: [bookingPreference.userId, bookingPreference.platform, bookingPreference.clubId],
      set: {
        lastClickedAt: at,
        lastCourtName: sql`coalesce(excluded.last_court_name, ${bookingPreference.lastCourtName})`,
      },
    })
    ```
- [ ] **Step 4: Run it.** `npx vitest run src/__tests__/account-repo.test.ts`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -m "feat: add favorites and booking preference repository"`

---

### Task 4: `/api/me/*` routes

**Files:**
- Create: `src/features/account/schemas.ts`
- Create: `src/features/account/server/require-user.ts`
- Create: `src/app/api/me/preferences/route.ts`
- Create: `src/app/api/me/favorites/[platform]/[clubId]/route.ts`
- Create: `src/app/api/me/favorites/merge/route.ts`
- Create: `src/app/api/me/booking-clicks/route.ts`
- Test: `src/__tests__/account-routes.test.ts`

**Interfaces:**
- Consumes: `auth` (Task 2); `db` (Task 2); everything in Task 3
- Produces, in `schemas.ts` (zod):
  - `clubRefSchema`: `{ platform: z.enum(['tenis4u','twojtennis']), clubId: z.string().min(1).max(64) }`
  - `bookingClickSchema`: `clubRefSchema` plus `court: z.string().min(1).max(64).nullish()`
  - `mergeSchema`: `{ favorites: z.array(club-key string).max(200) }`, where every key must pass `parseClubKey`
- Produces, in `require-user.ts`: `getUserId(request: Request): Promise<string | null>`, which uses `auth.api.getSession({ headers: request.headers })`
- Routes:

  | Route | Request | Response |
  |---|---|---|
  | `GET /api/me/preferences` | – | 200 `Preferences` |
  | `PUT /api/me/favorites/{platform}/{clubId}` | – | 204 |
  | `DELETE /api/me/favorites/{platform}/{clubId}` | – | 204 |
  | `POST /api/me/favorites/merge` | `{ favorites: string[] }` | 200 `{ favorites: string[] }` |
  | `POST /api/me/booking-clicks` | `{ platform, clubId, court? }` | 204 |

  All of them return 401 when `getUserId` is null, and 400 when zod rejects the input.

- [ ] **Step 1: Write the failing tests** in `src/__tests__/account-routes.test.ts`.
  - Setup:
    - `vi.mock('@/lib/auth')` so `auth.api.getSession` returns `null` or `{ user: { id: 'u1' } }`.
    - `vi.mock('@/db')` to return the PGlite db from `createTestDb()`.
    - Call the exported handlers directly with `new Request(...)`.
  - Cases:
    - Each of the 5 handlers returns 401 when signed out.
    - `PUT` with platform `'foo'` returns 400.
    - `POST booking-clicks` with a 65-character `court` returns 400.
    - Merge with 201 keys returns 400. Merge with `['tenis4u:1', 'bad']` returns 400 **and** `favorite` still has 0 rows (Review Focus 4).
    - Signed in: `PUT` then `GET` → `favorites` contains `'tenis4u:103'`.
    - Signed in: `POST booking-clicks` `{ platform: 'tenis4u', clubId: '103', court: 'Kort 1' }` then `GET` → `booked[0]` is `{ club: 'tenis4u:103', lastCourt: 'Kort 1' }`.
    - A body containing `userId: 'u2'` is ignored. The row is written for `u1`.
- [ ] **Step 2: Run it.** `npx vitest run src/__tests__/account-routes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the schemas, `getUserId`, and the four route files. Each route does exactly this: get the user id, validate the input, call one repo function. No logic beyond that.
- [ ] **Step 4: Run it.** `npx vitest run src/__tests__/account-routes.test.ts`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -m "feat: add /api/me preferences, favorites and booking-click routes"`

---

### Task 5: Ranking and court order (pure functions)

**Files:**
- Create: `src/features/account/ranking.ts`
- Test: `src/__tests__/ranking.test.ts`

**Interfaces:**
- Consumes: `Preferences`, `EMPTY_PREFERENCES`, `clubKey` (Task 3); `ClubResult` (`src/lib/types.ts`)
- Produces:
  ```ts
  rankClubs(clubs: ClubResult[], prefs: Preferences): { favorites: ClubResult[]; rest: ClubResult[] }
  orderCourts(courts: string[], lastCourt: string | null | undefined): string[] // lastCourt moved to the front if present, the rest keep their order
  lastCourtFor(club: ClubResult, prefs: Preferences): string | null
  ```
- Sort rule (spec section 3), applied to both groups:
  1. Booked beats not booked.
  2. Between two booked clubs, the newer `lastClickedAt` wins.
  3. Then more slots (`slots.length`) wins.
  4. Then `clubName` alphabetically, using `localeCompare(…, 'pl')`.

  Club keys come from `clubKey({ platform: club.platform, clubId: club.id })`.

- [ ] **Step 1: Write the failing tests.**
  - Use the spec's 5-club example (Sport Factory ⭐, Korty Hera booked 12 Oct, TCC booked 30 Sep, Wiosna 5 slots, Bulwary 3).
    - Signed-in result: `favorites` = `[Sport Factory]`, `rest` = `[Korty Hera, TCC, Wiosna, Bulwary]`.
    - With `EMPTY_PREFERENCES`: `favorites` = `[]`, `rest` = `[TCC, Wiosna, Bulwary, Sport Factory, Korty Hera]` (Review Focus 1).
  - Equal slots and nothing booked: alphabetical order (`'Ćwiczebny'` sorts after `'Cały'`).
  - Two favorites, one booked: the booked favorite is first inside `favorites`.
  - A favorite key and a booked key that aren't in `clubs` don't appear and don't throw (Review Focus 3).
  - `orderCourts(['Kort 1','Kort 2','Kort 3'], 'Kort 3')` returns `['Kort 3','Kort 1','Kort 2']`.
  - `orderCourts(courts, 'Kort 9')` and `orderCourts(courts, null)` return the courts unchanged.
- [ ] **Step 2: Run it.** `npx vitest run src/__tests__/ranking.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `ranking.ts`.** Write one comparator for the sort rule and use it for both groups.
- [ ] **Step 4: Run it.** `npx vitest run src/__tests__/ranking.test.ts`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -m "feat: add personal ranking and court ordering"`

---

### Task 6: Local favorites storage

**Files:**
- Create: `src/features/account/local-favorites.ts`
- Test: `src/__tests__/local-favorites.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  readLocalFavorites(store?: KeyStore): string[]          // store defaults to globalThis.localStorage
  writeLocalFavorites(keys: string[], store?: KeyStore): void
  clearLocalFavorites(store?: KeyStore): void
  ```
  The localStorage key is `favClubIds`. Reads keep only entries that pass `parseClubKey`, with duplicates removed.

- [ ] **Step 1: Write the failing tests.** Use an in-memory fake `KeyStore`.
  - Writing a list and reading it back returns the same list.
  - Duplicates are removed on read.
  - Review Focus 2:
    - Stored value `'not json'` reads as `[]`.
    - Stored value `'{"a":1}'` reads as `[]`.
    - A list containing `'bad'` drops that entry.
    - A store whose `getItem` throws reads as `[]`.
    - A store whose `setItem` throws: `writeLocalFavorites` doesn't throw.
  - `clearLocalFavorites`: a read afterwards returns `[]`.
- [ ] **Step 2: Run it.** `npx vitest run src/__tests__/local-favorites.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `local-favorites.ts`.**
- [ ] **Step 4: Run it.** `npx vitest run src/__tests__/local-favorites.test.ts`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -m "feat: add localStorage favorites with safe reads"`

---

### Task 7: Client hooks and sign-in sync

**Files:**
- Create: `src/lib/auth-client.ts`
- Create: `src/features/account/hooks.ts`
- Create: `src/features/account/components/AccountSync.tsx`
- Modify: `src/components/providers.tsx` (render `<AccountSync />` inside `QueryClientProvider`)

**Interfaces:**
- Consumes:
  - Routes from Task 4
  - `Preferences`, `EMPTY_PREFERENCES`, `clubKey` (Task 3)
  - Local favorites functions (Task 6)
- Produces:
  - `auth-client.ts`: `authClient = createAuthClient()` from `better-auth/react`
  - `hooks.ts`:
    ```ts
    usePreferences(): { prefs: Preferences; signedIn: boolean; failed: boolean }
    useFavorites(): { isFavorite(key: string): boolean; toggle(ref: ClubRef): void; error: boolean }
    useRecordBookingClick(): (ref: ClubRef, court: string | null) => void
    signOutAndClear(queryClient: QueryClient): Promise<void>
    ```

**How each piece behaves:**
- **`usePreferences`**
  - Signed out: `{ favorites: readLocalFavorites(), booked: [] }`
  - Signed in: React Query, key `['preferences']`, `GET /api/me/preferences`
  - If the request fails: `prefs` is `EMPTY_PREFERENCES` with the cached local favorites, and `failed: true`
- **`useFavorites().toggle`**
  - Signed out: updates `localStorage` plus local state.
  - Signed in: optimistic update of the `['preferences']` cache, then `PUT` or `DELETE`. If the request fails, roll back and set `error: true` for 3 seconds. On success, mirror the server list into `localStorage` (the quick-load copy).
- **`useRecordBookingClick`**
  - Signed out: does nothing.
  - Signed in: `fetch('/api/me/booking-clicks', { method: 'POST', keepalive: true, ... })`, fire-and-forget with the error swallowed, then invalidates `['preferences']`.
- **`AccountSync`** watches `authClient.useSession()`. When the session goes from none to a user, and only once per sign-in:
  1. If `readLocalFavorites()` isn't empty, `POST /api/me/favorites/merge`.
  2. `writeLocalFavorites(response.favorites)`.
  3. Invalidate `['preferences']`.
- **`signOutAndClear`**: `authClient.signOut()`, then `clearLocalFavorites()`, then `queryClient.removeQueries({ queryKey: ['preferences'] })`.

- [ ] **Step 1: Implement the four files** as described above.
- [ ] **Step 2: Check the build.** `npx tsc --noEmit && npm test`. Expected: no type errors, all earlier tests still pass.
- [ ] **Step 3: Commit.** `git commit -m "feat: add account hooks and sign-in favorites merge"`

These hooks are thin glue around functions already tested in Tasks 3–6. They are exercised end to end in Task 8's browser checks.

---

### Task 8: UI: account button, stars, ranked list

**Files:**
- Create: `src/features/account/components/AccountButton.tsx`
- Create: `src/features/account/components/StarButton.tsx`
- Modify: `src/app/page.tsx` (put the title in a header row, with `<AccountButton />` on the right)
- Modify: `src/features/club/components/ClubList.tsx`

**Interfaces:**
- Consumes: Task 7 hooks; `rankClubs`, `orderCourts`, `lastCourtFor` (Task 5); `authClient`
- Produces:
  - `<AccountButton />`
  - `<StarButton club={ClubRef} />`

**What each piece does:**
- **`AccountButton`**
  - Signed out: a `Zaloguj się` button that calls `authClient.signIn.social({ provider: 'google' })`.
  - Signed in: the Google avatar (or initials). Its menu shows the name and email, plus:
    - `Wyloguj`, which calls `signOutAndClear`.
    - `Usuń konto`, which shows the inline confirmation (`Usunąć konto? …`, `Usuń` / `Anuluj`). `Usuń` calls `authClient.deleteUser()`, then `signOutAndClear`.
- **`StarButton`**: ☆ / ★ that calls `useFavorites().toggle`. It has `aria-pressed` and `aria-label="Ulubione"`.
- **`ClubList`**
  - Takes the result of `rankClubs(clubs, prefs)` and renders:
    - `★ Ulubione` with the favorite cards, only if there are any
    - then `Wszystkie wyniki` with the rest
  - Each card has a `StarButton`. Favorite cards get a gold left border.
  - Court rows are ordered with `orderCourts(courtNames, lastCourtFor(club, prefs))`.
  - Each slot chip becomes an `<a href={club.bookingUrl} target="_blank">` whose `onClick` calls `recordBookingClick(ref, courtName)`.
  - The header `Zarezerwuj →` link calls `recordBookingClick(ref, null)`. It does **not** call `preventDefault`.
  - If `failed`, show `Nie udało się wczytać ulubionych` above the list. If `useFavorites().error`, show `Nie udało się zapisać. Spróbuj ponownie.`

- [ ] **Step 1: Implement the components and modify the two files** as described above.
- [ ] **Step 2: Check the build.** `npx tsc --noEmit && npm test`. Expected: all pass.
- [ ] **Step 3: Check it in the browser** with `npm run dev`, logged out first, against Neon `dev`:
  1. Search today, 13:00–17:00. The list is ordered by slot count, with no `★ Ulubione` section.
  2. Star a club. `★ Ulubione` appears. Reload the page: it's still starred (`localStorage`).
  3. Click `Zaloguj się` and sign in with Google. You're back on the page with your avatar. The starred club is still in Ulubione. In the Neon `dev` SQL editor, `select * from favorite` shows the row.
  4. Click a slot chip at a club that isn't first. The booking site opens in a new tab immediately. Back in the app, that club is first in `Wszystkie wyniki`, and its court row is first.
  5. Click `Wyloguj`. Ulubione disappears, the list is back to slot order, and `localStorage.favClubIds` is gone.
  6. Sign in again. Ulubione and the booking order come back.
  7. Avatar → `Usuń konto` → `Usuń`. You're signed out. `select count(*) from favorite` and `select count(*) from booking_preference` both return 0 for that user.
- [ ] **Step 4: Commit.** `git commit -m "feat: add sign-in button, favorites and personal ordering to results"`

---

### Task 9: 👤 Deploy to Vercel with the production database

**Files:**
- Create: `vercel.json` (only if a build setting is needed; otherwise none)

- [ ] **Step 1 (user): Production redirect address.** In Google Cloud Console, add the production redirect URI `https://<domain>/api/auth/callback/google`, then publish the consent screen to "In production".
- [ ] **Step 2: Migrate production.** Apply the migration to Neon `main`: `DATABASE_URL="<main connection string>" npm run db:migrate`. Expected: finishes without errors. The executor never prints the connection string.
- [ ] **Step 3 (user): Vercel project.** Import the GitHub repo into Vercel (Hobby) and set the five environment variables for Production:
  - `DATABASE_URL`: the Neon **main** connection string
  - `BETTER_AUTH_URL`: `https://<domain>`
  - `BETTER_AUTH_SECRET`: a new one, different from local
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

  Optionally attach the custom domain.
- [ ] **Step 4: Check the live site.** Repeat Task 8 Step 3, items 1–4 and 7.
- [ ] **Step 5: Commit** any config change.

---

## Self-review notes

- **Spec coverage:**
  - §2 → Tasks 7, 8
  - §3 → Task 5
  - §4 → Tasks 6, 7
  - §5 → Tasks 3, 7, 8
  - §6 → Tasks 4, 7
  - §7 → Tasks 2, 3
  - §8 → Tasks 1, 2
  - §9 → Tasks 1, 2, 9
  - §10 → Tasks 2 (cascade), 8 (delete)
  - §11 → Tasks 7, 8
  - §12 → Tasks 3–6, plus 8 and 9 by hand
- **Calendar column order** is wired into court rows now. The redesign's calendar reuses `orderCourts`.
