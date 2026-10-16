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
import type { Preferences } from '../types'

// Merges signed-out favorites into the account once per sign-in. Renders nothing.
// A localStorage owner marker tells a real sign-in from a page reload with a live session.
export function AccountSync() {
  const queryClient = useQueryClient()
  const session = authClient.useSession()
  const userId = session.isPending ? null : (session.data?.user.id ?? null)
  const inFlightFor = useRef<string | null>(null)

  useEffect(() => {
    if (session.isPending) return
    if (!userId) {
      inFlightFor.current = null
      // Known signed out but an owner marker remains: it is a previous account's mirror
      // (session expired, or signed out in another tab). A signed-out user's own favorites have no owner.
      if (readLocalOwner() !== null) {
        clearLocalFavorites()
        queryClient.setQueryData(['local-favorites'], [])
      }
      return
    }
    if (inFlightFor.current === userId || readLocalOwner() === userId) return
    inFlightFor.current = userId

    void (async () => {
      let merged = false
      try {
        const local = readLocalFavorites()
        if (local.length === 0) {
          merged = true
        } else {
          const res = await fetch('/api/me/favorites/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorites: local }),
          })
          if (res.ok) {
            const body = (await res.json()) as { favorites: string[] }
            writeLocalFavorites(body.favorites)
            queryClient.setQueryData(['local-favorites'], body.favorites)
            merged = true
          }
        }
      } catch {
        // merge is best effort; retried on the next load because the owner is not written
      }
      if (!merged) return
      writeLocalOwner(userId)
      try {
        await queryClient.invalidateQueries({ queryKey: ['preferences'] })
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
