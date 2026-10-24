# Testing

## How tests are organised

| Layer | Tool | Data | When | Catches |
|---|---|---|---|---|
| Lint (incl. a11y rules) | ESLint + `jsx-a11y` | n/a | every PR | obvious a11y and code mistakes |
| Typecheck | `tsc --noEmit` | n/a | every PR | type errors |
| Unit + component | Vitest + Testing Library + axe-core | in-memory | every PR | logic bugs, component a11y violations |
| API integration | Vitest + PGlite + stubbed `fetch` | PGlite DB, fixture JSON | every PR | route handler and booking-client mapping bugs |
| E2E + a11y + keyboard | Playwright + `@axe-core/playwright` | `/api/search` mocked in the browser | production deploy, blocks release | the deployed UI breaking |

No test ever calls the real tenis4u / twojtennis APIs. A change on their side won't be caught by tests.

```bash
npm test                    # Vitest: unit, component, API integration
npm run test:watch          # Vitest in watch mode
npm run test:e2e            # Playwright against `next dev` on :3100 (dev database)
E2E_BASE_URL=https://… npm run test:e2e   # Playwright against a deployment
npx playwright show-report  # open the last HTML report
```

- Vitest tests: `src/__tests__/`, fixtures in `src/__tests__/fixtures/`.
- Playwright: `e2e/`. Every spec imports `test` from `e2e/support/guard.ts`, which fails a test if any `/api/search` request wasn't mocked, or if the page logged a console error.

## Branch protection (one-time, by hand)

Makes the `checks` job from `.github/workflows/ci.yml` required before merging into `main`.

1. GitHub → repository → **Settings** → **Branches** → **Add branch ruleset** (or "Add rule").
2. Target branch: `main`.
3. Enable **Require status checks to pass** → add `checks`.
4. Save.

The `checks` job must have run at least once (open any PR) before GitHub lets you pick it.

## Production release gate (one-time, by hand)

How it works: merge to `main` → Vercel builds the production deployment but **holds it** → `.github/workflows/e2e.yml` runs Playwright against that deployment's own URL → green means Vercel puts it on the domain, red means the old version stays live.

1. **Bypass secret.** Vercel → project → **Settings** → **Deployment Protection** → **Protection Bypass for Automation** → create a secret and copy it.
2. **Store it in GitHub.** GitHub → repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**: name `VERCEL_AUTOMATION_BYPASS_SECRET`, value from step 1.
3. **Merge the workflow to `main`.** Vercel's trigger (`repository_dispatch`) only starts workflows that exist on `main`.
4. **Turn on the check.** Vercel → project → **Settings** → **Deployment Checks** → **Add Checks** → **GitHub** → select `Vercel - <project name>: e2e`. It only shows up after the workflow has run once: trigger a production deploy (or redeploy) and wait for the E2E run. Also confirm automatic production aliasing is on (**Settings** → **Environments** → Production).
   - **If Deployment Checks isn't available on your plan:** stop there. The fallback is an alert-only run after the deploy plus manual Instant Rollback; that needs a small workflow change.

### When it fails

- GitHub → **Actions** → the failed **E2E** run → **Artifacts** → download `playwright-report`, unzip, then `npx playwright show-report <folder>`. Failed tests have a screenshot and a trace (a step-by-step recording you can scrub through).
- "Got Vercel's auth page" in the `setup` test means the bypass secret is missing or wrong.
- Emergency: Vercel → the held deployment → **Force Promote** skips the checks.
- Re-run by hand: Actions → **E2E** → **Run workflow** with a deployment URL.

## Accessibility backlog

Found by the axe scans in `e2e/a11y.spec.ts` (report-only until this list is empty; then add `A11Y_STRICT: '1'` to the job `env` in `.github/workflows/e2e.yml`).

**Colour (needs your approval, colours are not changed without it):**

- `color-contrast`: the grey summary text on the **selected** club card (`text-muted-foreground`, #737373 on the selected card's #eff6ff background) is 4.35:1; WCAG AA needs 4.5:1 for small text. Desktop results view only.

**Non-colour:** none open. Fixed while adding the tests: date field and Od/Do selects had no accessible name; the date picker couldn't be used with arrow keys and opened with focus on the month navigation.

Dark mode isn't scanned: the `.dark` theme exists in `globals.css`, but nothing in the app turns it on.
