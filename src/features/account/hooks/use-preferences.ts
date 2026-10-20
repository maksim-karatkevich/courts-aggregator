'use client'

import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPreferences } from '../client/api'
import { readLocalOwner, writeLocalFavorites, writeLocalOwner } from '../client/local-favorites'
import { LOCAL_KEY, PREFS_KEY } from '../client/query-keys'
import { shouldMirror } from '../model/sync-decision'
import type { Preferences } from '../model/types'
import { useLocalFavorites } from './use-local-favorites'
import { useSessionState } from './use-session-state'

export function usePreferences(): {
  prefs: Preferences
  signedIn: boolean
  failed: boolean
  ready: boolean
} {
  const queryClient = useQueryClient()
  const { userId, ready } = useSessionState()
  const signedIn = userId !== null
  const local = useLocalFavorites()
  const query = useQuery({
    queryKey: PREFS_KEY,
    queryFn: fetchPreferences,
    enabled: signedIn,
  })

  // The server's answer overwrites the quick-load copy, but only once this user owns the
  // local copy (after any pending merge), so unmerged local favorites are never wiped.
  const data = query.data
  useEffect(() => {
    if (!userId || !data || !shouldMirror(userId, readLocalOwner())) return
    writeLocalFavorites(data.favorites)
    writeLocalOwner(userId)
    queryClient.setQueryData(LOCAL_KEY, data.favorites)
  }, [data, userId, queryClient])

  // Stable identity, so consumers can memoize on prefs.
  const localPrefs = useMemo<Preferences>(() => ({ favorites: local, booked: [] }), [local])

  if (!signedIn) return { prefs: localPrefs, signedIn: false, failed: false, ready }
  if (data) return { prefs: data, signedIn: true, failed: false, ready }
  return { prefs: localPrefs, signedIn: true, failed: query.isError, ready }
}
