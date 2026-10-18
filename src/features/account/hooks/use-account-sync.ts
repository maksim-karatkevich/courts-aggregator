'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { clearLocalFavorites, readLocalFavorites, readLocalOwner } from '../client/local-favorites'
import { LOCAL_KEY } from '../client/query-keys'
import { claimAndRefresh, mergeStep } from '../client/sync-steps'
import { decideSync } from '../model/sync-decision'

// Merges signed-out favorites into the account once per sign-in.
// A localStorage owner marker tells a real sign-in from a page reload with a live session.
export function useAccountSync(): void {
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
      queryClient.setQueryData(LOCAL_KEY, [])
      return
    }
    if ((action !== 'merge' && action !== 'own') || !userId) return
    inFlightFor.current = userId
    const stillCurrent = () => inFlightFor.current === userId

    void (async () => {
      if (action === 'merge' && !(await mergeStep(local, queryClient, stillCurrent))) return
      if (!stillCurrent()) return
      await claimAndRefresh(userId, queryClient, stillCurrent)
    })()
  }, [session.isPending, userId, queryClient])
}
