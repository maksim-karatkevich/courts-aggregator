'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import {
  clearLocalFavorites,
  readLocalFavorites,
  readLocalOwner,
  writeLocalFavorites,
  writeLocalOwner,
} from '../local-favorites'
import { decideSync } from '../sync-decision'
import type { Preferences } from '../types'

// Merges signed-out favorites into the account once per sign-in. Renders nothing.
// A localStorage owner marker tells a real sign-in from a page reload with a live session.
export function AccountSync() {
  const queryClient = useQueryClient()
  const session = authClient.useSession()
  const userId = session.isPending ? null : (session.data?.user.id ?? null)
  const inFlightFor = useRef<string | null>(null)

  useEffect(() => {
    if (!session.isPending && !userId) inFlightFor.current = null // signed out: abandon any merge
    const local = userId ? readLocalFavorites() : []
    const action = decideSync({
      pending: session.isPending,
      userId,
      owner: readLocalOwner(),
      inFlight: userId !== null && inFlightFor.current === userId,
      localCount: local.length,
    })

    if (action === 'clear') {
      clearLocalFavorites()
      queryClient.setQueryData(['local-favorites'], [])
      return
    }
    if ((action !== 'merge' && action !== 'own') || !userId) return
    inFlightFor.current = userId
    // After every await: stop if the user signed out (or switched) meanwhile, so a late
    // response never writes this user's list or owner marker.
    const stillCurrent = () => inFlightFor.current === userId

    void (async () => {
      let merged = action === 'own'
      if (action === 'merge') {
        try {
          const res = await fetch('/api/me/favorites/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorites: local }),
          })
          if (!stillCurrent()) return
          if (res.ok) {
            const body = (await res.json()) as { favorites: string[] }
            if (!stillCurrent()) return
            writeLocalFavorites(body.favorites)
            queryClient.setQueryData(['local-favorites'], body.favorites)
            merged = true
          }
        } catch {
          // merge is best effort; retried on the next load because the owner is not written
        }
      }
      if (!merged || !stillCurrent()) return
      writeLocalOwner(userId)
      try {
        await queryClient.invalidateQueries({ queryKey: ['preferences'] })
        if (!stillCurrent()) return
        const server = queryClient.getQueryData<Preferences>(['preferences'])
        if (server) {
          writeLocalFavorites(server.favorites)
          queryClient.setQueryData(['local-favorites'], server.favorites)
        }
      } catch {
        // refetch failed: the merge result stays as the local copy
      }
    })()
  }, [session.isPending, userId, queryClient])

  return null
}
