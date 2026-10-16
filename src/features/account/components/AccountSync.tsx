'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { readLocalFavorites, writeLocalFavorites } from '../local-favorites'

// Merges signed-out favorites into the account once per sign-in. Renders nothing.
export function AccountSync() {
  const queryClient = useQueryClient()
  const userId = authClient.useSession().data?.user.id ?? null
  const mergedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) {
      mergedFor.current = null
      return
    }
    if (mergedFor.current === userId) return
    mergedFor.current = userId

    void (async () => {
      try {
        const local = readLocalFavorites()
        if (local.length > 0) {
          const res = await fetch('/api/me/favorites/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorites: local }),
          })
          if (res.ok) {
            const body = (await res.json()) as { favorites: string[] }
            writeLocalFavorites(body.favorites)
            queryClient.setQueryData(['local-favorites'], body.favorites)
          }
        }
      } catch {
        // merge is best effort; the server list still loads below
      }
      void queryClient.invalidateQueries({ queryKey: ['preferences'] })
    })()
  }, [userId, queryClient])

  return null
}
