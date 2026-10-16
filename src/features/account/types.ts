import { Platform } from '@/lib/types'

export type ClubRef = { platform: Platform; clubId: string }
export type BookedClub = { club: string; lastClickedAt: string; lastCourt: string | null }
export type Preferences = { favorites: string[]; booked: BookedClub[] }

export const EMPTY_PREFERENCES: Preferences = { favorites: [], booked: [] }

export function clubKey(ref: ClubRef): string {
  return `${ref.platform}:${ref.clubId}`
}

const PLATFORMS: readonly string[] = Object.values(Platform)

export function parseClubKey(key: string): ClubRef | null {
  const i = key.indexOf(':')
  if (i === -1) return null
  const platform = key.slice(0, i)
  const clubId = key.slice(i + 1)
  if (!PLATFORMS.includes(platform) || clubId === '') return null
  return { platform: platform as Platform, clubId }
}

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
