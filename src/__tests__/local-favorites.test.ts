import { describe, it, expect } from 'vitest'
import {
  readLocalFavorites,
  writeLocalFavorites,
  clearLocalFavorites,
  type KeyStore,
} from '@/features/account/local-favorites'

function fakeStore(initial: Record<string, string> = {}): KeyStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const throwing = (): never => {
  throw new Error('denied')
}

describe('local favorites', () => {
  it('round-trips a list', () => {
    const s = fakeStore()
    writeLocalFavorites(['tenis4u:103', 'tenis4u:7'], s)
    expect(readLocalFavorites(s)).toEqual(['tenis4u:103', 'tenis4u:7'])
  })

  it('removes duplicates on read, keeping first-seen order', () => {
    const s = fakeStore({ favClubIds: JSON.stringify(['tenis4u:2', 'tenis4u:1', 'tenis4u:2']) })
    expect(readLocalFavorites(s)).toEqual(['tenis4u:2', 'tenis4u:1'])
  })

  it('reads invalid JSON as empty', () => {
    expect(readLocalFavorites(fakeStore({ favClubIds: 'not json' }))).toEqual([])
  })

  it('reads a non-array value as empty', () => {
    expect(readLocalFavorites(fakeStore({ favClubIds: '{"a":1}' }))).toEqual([])
  })

  it('drops invalid and non-string entries', () => {
    const s = fakeStore({ favClubIds: JSON.stringify(['tenis4u:1', 'bad', 5, null]) })
    expect(readLocalFavorites(s)).toEqual(['tenis4u:1'])
  })

  it('reads empty when getItem throws', () => {
    const s: KeyStore = { getItem: throwing, setItem: throwing, removeItem: throwing }
    expect(readLocalFavorites(s)).toEqual([])
  })

  it('does not throw when setItem throws', () => {
    const s: KeyStore = { getItem: () => null, setItem: throwing, removeItem: throwing }
    expect(() => writeLocalFavorites(['tenis4u:1'], s)).not.toThrow()
    expect(() => clearLocalFavorites(s)).not.toThrow()
  })

  it('clear empties the list', () => {
    const s = fakeStore()
    writeLocalFavorites(['tenis4u:1'], s)
    clearLocalFavorites(s)
    expect(readLocalFavorites(s)).toEqual([])
  })

  it('treats a missing default store as empty (node)', () => {
    expect(readLocalFavorites()).toEqual([])
    expect(() => writeLocalFavorites(['tenis4u:1'])).not.toThrow()
    expect(() => clearLocalFavorites()).not.toThrow()
  })
})
