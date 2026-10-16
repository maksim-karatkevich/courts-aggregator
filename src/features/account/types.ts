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
