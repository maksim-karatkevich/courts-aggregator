// Pure decisions behind AccountSync and the server→localStorage mirror, kept free of
// React so the sign-in lifecycle can be unit-tested.

export type SyncInput = {
  pending: boolean // session still loading
  userId: string | null // signed-in user, null when known signed out
  owner: string | null // localStorage owner marker
  inFlight: boolean // a merge for this userId is already running
  localCount: number // number of local (signed-out) favorites
}

// wait: session unknown yet. clear: drop a previous account's mirror.
// merge: POST local favorites, then own. own: nothing to merge, just mark owned.
// skip: nothing to do.
export type SyncAction = 'wait' | 'clear' | 'merge' | 'own' | 'skip'

export function decideSync({ pending, userId, owner, inFlight, localCount }: SyncInput): SyncAction {
  if (pending) return 'wait'
  if (!userId) {
    // Known signed out but an owner marker remains: it is a previous account's mirror
    // (session expired, or signed out in another tab). A signed-out user's own favorites have no owner.
    return owner !== null ? 'clear' : 'skip'
  }
  if (inFlight || owner === userId) return 'skip'
  return localCount === 0 ? 'own' : 'merge'
}

// The server list may overwrite the local copy only once this user owns it,
// so unmerged local favorites are never wiped.
export function shouldMirror(userId: string | null, owner: string | null): boolean {
  return userId !== null && owner === userId
}
