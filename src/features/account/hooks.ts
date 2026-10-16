'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { clearLocalFavorites, readLocalFavorites, writeLocalFavorites } from './local-favorites'
import { clubKey, type ClubRef, type Preferences } from './types'

const LOCAL_KEY = ['local-favorites'] as const
const PREFS_KEY = ['preferences'] as const
const ERROR_MS = 3000

function favoritePath(ref: ClubRef): string {
  return `/api/me/favorites/${encodeURIComponent(ref.platform)}/${encodeURIComponent(ref.clubId)}`
}

async function fetchPreferences(): Promise<Preferences> {
  const res = await fetch('/api/me/preferences')
  if (!res.ok) throw new Error(`preferences ${res.status}`)
  return (await res.json()) as Preferences
}

function useSignedIn(): boolean {
  return Boolean(authClient.useSession().data?.user)
}

// Signed-out favorites live in the query cache so every component using these hooks agrees.
// Server render has no localStorage, so data is undefined there and we fall back to [].
function useLocalFavorites(): string[] {
  const { data } = useQuery({
    queryKey: LOCAL_KEY,
    queryFn: () => readLocalFavorites(),
    staleTime: Infinity,
  })
  return data ?? []
}

export function usePreferences(): { prefs: Preferences; signedIn: boolean; failed: boolean } {
  const signedIn = useSignedIn()
  const local = useLocalFavorites()
  const query = useQuery({
    queryKey: PREFS_KEY,
    queryFn: fetchPreferences,
    enabled: signedIn,
  })

  if (!signedIn) return { prefs: { favorites: local, booked: [] }, signedIn: false, failed: false }
  if (query.data) return { prefs: query.data, signedIn: true, failed: false }
  return {
    prefs: { favorites: local, booked: [] },
    signedIn: true,
    failed: query.isError,
  }
}

export function useFavorites(): {
  isFavorite: (key: string) => boolean
  toggle: (ref: ClubRef) => void
  error: boolean
} {
  const queryClient = useQueryClient()
  const { prefs, signedIn } = usePreferences()
  const [error, setError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const flagError = useCallback(() => {
    setError(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setError(false), ERROR_MS)
  }, [])

  const isFavorite = useCallback((key: string) => prefs.favorites.includes(key), [prefs.favorites])

  const toggle = useCallback(
    (ref: ClubRef) => {
      const key = clubKey(ref)
      // Always read the cache at call time so rapid toggles never act on a stale closure.
      const current = (): string[] => {
        const p = queryClient.getQueryData<Preferences>(PREFS_KEY)
        return p?.favorites ?? queryClient.getQueryData<string[]>(LOCAL_KEY) ?? readLocalFavorites()
      }

      if (!signedIn) {
        const list = current()
        const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
        writeLocalFavorites(next)
        queryClient.setQueryData(LOCAL_KEY, next)
        return
      }

      const wasFavorite = current().includes(key)
      const apply = (add: boolean) =>
        queryClient.setQueryData<Preferences>(PREFS_KEY, (old) => {
          const base = old ?? { favorites: current(), booked: [] }
          const rest = base.favorites.filter((k) => k !== key)
          return { ...base, favorites: add ? [...rest, key] : rest }
        })

      void (async () => {
        await queryClient.cancelQueries({ queryKey: PREFS_KEY })
        apply(!wasFavorite)
        try {
          const res = await fetch(favoritePath(ref), { method: wasFavorite ? 'DELETE' : 'PUT' })
          if (!res.ok) throw new Error(`favorite ${res.status}`)
        } catch {
          apply(wasFavorite) // roll back only this club, leaving other toggles alone
          flagError()
          return
        }
        // Server is the truth: refetch, then mirror its list into the localStorage quick-load copy.
        try {
          await queryClient.invalidateQueries({ queryKey: PREFS_KEY })
          const server = queryClient.getQueryData<Preferences>(PREFS_KEY)
          if (server) {
            writeLocalFavorites(server.favorites)
            queryClient.setQueryData(LOCAL_KEY, server.favorites)
          }
        } catch {
          // refetch failed: the optimistic cache stands
        }
      })()
    },
    [queryClient, signedIn, flagError]
  )

  return { isFavorite, toggle, error }
}

export function useRecordBookingClick(): (ref: ClubRef, court: string | null) => void {
  const queryClient = useQueryClient()
  const signedIn = useSignedIn()

  return useCallback(
    (ref: ClubRef, court: string | null) => {
      if (!signedIn) return
      try {
        void fetch('/api/me/booking-clicks', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: ref.platform, clubId: ref.clubId, court }),
        })
          .catch(() => {})
          .finally(() => {
            void queryClient.invalidateQueries({ queryKey: PREFS_KEY })
          })
      } catch {
        // never block the booking link
      }
    },
    [queryClient, signedIn]
  )
}

export async function signOutAndClear(queryClient: QueryClient): Promise<void> {
  await authClient.signOut()
  clearLocalFavorites()
  queryClient.setQueryData(LOCAL_KEY, [])
  queryClient.removeQueries({ queryKey: PREFS_KEY })
}
