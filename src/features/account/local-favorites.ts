import { parseClubKey } from './types'

export type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const STORAGE_KEY = 'favClubIds'

// Resolved at call time: localStorage is missing in node and can throw on access
// (private mode, blocked site data). A missing store behaves like a broken one.
function defaultStore(): KeyStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readLocalFavorites(store?: KeyStore): string[] {
  try {
    const s = store ?? defaultStore()
    if (!s) return []
    const raw = s.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    for (const entry of parsed) {
      if (typeof entry === 'string' && parseClubKey(entry) !== null) seen.add(entry)
    }
    return [...seen]
  } catch {
    return []
  }
}

export function writeLocalFavorites(keys: string[], store?: KeyStore): void {
  try {
    const s = store ?? defaultStore()
    s?.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // storage unavailable or full: favorites just won't persist
  }
}

export function clearLocalFavorites(store?: KeyStore): void {
  try {
    const s = store ?? defaultStore()
    s?.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
