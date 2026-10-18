'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { saveFavorite } from '../client/api'
import { readLocalFavorites, writeLocalFavorites } from '../client/local-favorites'
import { LOCAL_KEY, PREFS_KEY } from '../client/query-keys'
import { flagSaveError } from '../client/save-error'
import { clubKey } from '../model/club-key'
import type { ClubRef, Preferences } from '../model/types'
import { usePreferences } from './use-preferences'

export function useFavorites(): {
  isFavorite: (key: string) => boolean
  toggle: (ref: ClubRef) => void
  ready: boolean
} {
  const queryClient = useQueryClient()
  const { prefs, signedIn, ready } = usePreferences()

  const isFavorite = useCallback((key: string) => prefs.favorites.includes(key), [prefs.favorites])

  const toggle = useCallback(
    (ref: ClubRef) => {
      if (!ready) return
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
          await saveFavorite(ref, !wasFavorite)
        } catch {
          apply(wasFavorite) // roll back only this club, leaving other toggles alone
          flagSaveError(queryClient)
          return
        }
        // Server is the truth: refetch; usePreferences mirrors the result into localStorage.
        void queryClient.invalidateQueries({ queryKey: PREFS_KEY })
      })()
    },
    [queryClient, signedIn, ready]
  )

  return { isFavorite, toggle, ready }
}
