import type { BookedClub, Preferences } from './types'

export const EMPTY_PREFERENCES: Preferences = { favorites: [], booked: [] }

// The preferences response is never trusted: anything malformed becomes empty, so the
// ranking code always gets arrays and search keeps working.
export function toPreferences(raw: unknown): Preferences {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const favorites = Array.isArray(obj.favorites)
    ? obj.favorites.filter((k): k is string => typeof k === 'string')
    : []
  const booked: BookedClub[] = []
  if (Array.isArray(obj.booked)) {
    for (const b of obj.booked) {
      if (typeof b !== 'object' || b === null) continue
      const { club, lastClickedAt, lastCourt } = b as Record<string, unknown>
      if (typeof club !== 'string' || typeof lastClickedAt !== 'string') continue
      booked.push({ club, lastClickedAt, lastCourt: typeof lastCourt === 'string' ? lastCourt : null })
    }
  }
  return { favorites, booked }
}
