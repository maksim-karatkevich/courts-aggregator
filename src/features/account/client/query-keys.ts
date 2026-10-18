// Every React Query cache key for the account feature, in one place, so a typo in a string
// literal can't silently create a second cache entry.
export const LOCAL_KEY = ['local-favorites'] as const
export const PREFS_KEY = ['preferences'] as const
export const SAVE_ERROR_KEY = ['favorites-save-error'] as const
