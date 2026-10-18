'use client'

import type { QueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { clearLocalFavorites } from '../client/local-favorites'
import { LOCAL_KEY, PREFS_KEY } from '../client/query-keys'

export async function signOutAndClear(queryClient: QueryClient): Promise<void> {
  try {
    await authClient.signOut()
  } finally {
    // Local state is cleared even if the server call fails.
    clearLocalFavorites()
    queryClient.setQueryData(LOCAL_KEY, [])
    queryClient.removeQueries({ queryKey: PREFS_KEY })
  }
}
