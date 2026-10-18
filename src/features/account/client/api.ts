import { toPreferences } from '../model/preferences'
import type { ClubRef, Preferences } from '../model/types'

// Every request the browser makes to /api/me/*. Callers decide what a failure means.

function favoritePath(ref: ClubRef): string {
  return `/api/me/favorites/${encodeURIComponent(ref.platform)}/${encodeURIComponent(ref.clubId)}`
}

export async function fetchPreferences(): Promise<Preferences> {
  const res = await fetch('/api/me/preferences')
  if (!res.ok) throw new Error(`preferences ${res.status}`)
  return toPreferences(await res.json())
}

export async function saveFavorite(ref: ClubRef, add: boolean): Promise<void> {
  const res = await fetch(favoritePath(ref), { method: add ? 'PUT' : 'DELETE' })
  if (!res.ok) throw new Error(`favorite ${res.status}`)
}

// Resolves to the merged list, or null when the server refused (the caller retries next load).
export async function mergeLocalFavorites(favorites: string[]): Promise<string[] | null> {
  const res = await fetch('/api/me/favorites/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorites }),
  })
  if (!res.ok) return null
  const body = (await res.json()) as { favorites: string[] }
  return body.favorites
}

export function postBookingClick(ref: ClubRef, court: string | null): Promise<Response> {
  return fetch('/api/me/booking-clicks', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform: ref.platform, clubId: ref.clubId, court }),
  })
}
