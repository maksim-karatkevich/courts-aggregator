import type { QueryClient } from '@tanstack/react-query'
import { SAVE_ERROR_KEY } from './query-keys'

// A failed favorite save, kept in the query cache so the banner (in ClubList) sees what a
// StarButton reports: useState inside a shared hook would give each component its own copy.
export const SAVE_ERROR_MS = 3000

// Each failure stores a new number, and its timer clears only that number, so an older
// failure's timer never hides a newer one early. Numbers, not `{}`: structural sharing
// keeps the old object when a new one is deep-equal, so two `{}` tokens would collide.
let lastToken = 0

export function flagSaveError(queryClient: QueryClient): void {
  const token = ++lastToken
  queryClient.setQueryData<number | null>(SAVE_ERROR_KEY, token)
  setTimeout(() => {
    queryClient.setQueryData<number | null>(SAVE_ERROR_KEY, (current) => (current === token ? null : current))
  }, SAVE_ERROR_MS)
}
