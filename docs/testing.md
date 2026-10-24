# Testing

## Branch protection (one-time, by hand)

Makes the `checks` job from `.github/workflows/ci.yml` required before merging into `main`.

1. GitHub → repository → **Settings** → **Branches** → **Add branch ruleset** (or "Add rule").
2. Target branch: `main`.
3. Enable **Require status checks to pass** → add `checks`.
4. Save.

The `checks` job must have run at least once (open any PR) before GitHub lets you pick it.

## Accessibility backlog

Found by the axe scans in `e2e/a11y.spec.ts` (report-only until this list is empty; then set `A11Y_STRICT: '1'` in `.github/workflows/e2e.yml`).

**Colour (needs your approval, colours are not changed without it):**

- `color-contrast`: the grey summary text on the **selected** club card (`text-muted-foreground`, #737373 on the selected card's #eff6ff background) is 4.35:1; WCAG AA needs 4.5:1 for small text. Desktop results view only.

**Non-colour:** none open. Fixed while adding the tests: date field and Od/Do selects had no accessible name; the date picker couldn't be used with arrow keys and opened with focus on the month navigation.

Dark mode isn't scanned: the `.dark` theme exists in `globals.css`, but nothing in the app turns it on.
