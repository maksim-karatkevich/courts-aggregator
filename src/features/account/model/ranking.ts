import type { ClubResult } from '@/lib/types'
import { clubKey } from './club-key'
import type { Preferences } from './types'

function keyOf(club: ClubResult): string {
  return clubKey({ platform: club.platform, clubId: club.id })
}

function clickedAt(club: ClubResult, lastClicked: Map<string, number>): number | undefined {
  return lastClicked.get(keyOf(club))
}

export function rankClubs(
  clubs: ClubResult[],
  prefs: Preferences,
): { favorites: ClubResult[]; rest: ClubResult[] } {
  const lastClicked = new Map<string, number>()
  for (const b of prefs.booked) {
    const t = Date.parse(b.lastClickedAt)
    if (!Number.isNaN(t)) lastClicked.set(b.club, t)
  }
  const favoriteKeys = new Set(prefs.favorites)

  const compare = (a: ClubResult, b: ClubResult): number => {
    const ta = clickedAt(a, lastClicked)
    const tb = clickedAt(b, lastClicked)
    if (ta !== undefined && tb === undefined) return -1
    if (ta === undefined && tb !== undefined) return 1
    if (ta !== undefined && tb !== undefined && ta !== tb) return tb - ta
    if (a.slots.length !== b.slots.length) return b.slots.length - a.slots.length
    return a.clubName.localeCompare(b.clubName, 'pl')
  }

  const sorted = [...clubs].sort(compare)
  return {
    favorites: sorted.filter(c => favoriteKeys.has(keyOf(c))),
    rest: sorted.filter(c => !favoriteKeys.has(keyOf(c))),
  }
}

export function orderCourts(courts: string[], lastCourt: string | null | undefined): string[] {
  if (!lastCourt || !courts.includes(lastCourt)) return [...courts]
  return [lastCourt, ...courts.filter(c => c !== lastCourt)]
}

export function lastCourtFor(club: ClubResult, prefs: Preferences): string | null {
  const key = keyOf(club)
  return prefs.booked.find(b => b.club === key)?.lastCourt ?? null
}
