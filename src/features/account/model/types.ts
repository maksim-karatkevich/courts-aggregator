import type { Platform } from '@/lib/types'

export type ClubRef = { platform: Platform; clubId: string }
export type BookedClub = { club: string; lastClickedAt: string; lastCourt: string | null }
export type Preferences = { favorites: string[]; booked: BookedClub[] }
