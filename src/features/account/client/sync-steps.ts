import type { QueryClient } from '@tanstack/react-query'
import { mergeLocalFavorites } from './api'
import { writeLocalFavorites, writeLocalOwner } from './local-favorites'
import { LOCAL_KEY, PREFS_KEY } from './query-keys'
import type { Preferences } from '../model/types'

// The two async steps of a sign-in sync. Each takes `stillCurrent`, which turns false once the
// user signs out or switches, so a late response never writes another user's list or marker.
type StillCurrent = () => boolean

// Sends signed-out favorites to the account and keeps the merged list as the local copy.
// Best effort: false means "retry on the next load" (the owner marker is not written).
export async function mergeStep(
  local: string[],
  queryClient: QueryClient,
  stillCurrent: StillCurrent
): Promise<boolean> {
  try {
    const merged = await mergeLocalFavorites(local)
    if (!merged || !stillCurrent()) return false
    writeLocalFavorites(merged)
    queryClient.setQueryData(LOCAL_KEY, merged)
    return true
  } catch {
    return false
  }
}

// Marks this user as owner of the local copy, then pulls the server list into it.
export async function claimAndRefresh(
  userId: string,
  queryClient: QueryClient,
  stillCurrent: StillCurrent
): Promise<void> {
  writeLocalOwner(userId)
  try {
    await queryClient.invalidateQueries({ queryKey: PREFS_KEY })
    if (!stillCurrent()) return
    const server = queryClient.getQueryData<Preferences>(PREFS_KEY)
    if (server) {
      writeLocalFavorites(server.favorites)
      queryClient.setQueryData(LOCAL_KEY, server.favorites)
    }
  } catch {
    // refetch failed: the merge result stays as the local copy
  }
}
