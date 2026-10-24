# Testing

## Branch protection (one-time, by hand)

Makes the `checks` job from `.github/workflows/ci.yml` required before merging into `main`.

1. GitHub → repository → **Settings** → **Branches** → **Add branch ruleset** (or "Add rule").
2. Target branch: `main`.
3. Enable **Require status checks to pass** → add `checks`.
4. Save.

The `checks` job must have run at least once (open any PR) before GitHub lets you pick it.
