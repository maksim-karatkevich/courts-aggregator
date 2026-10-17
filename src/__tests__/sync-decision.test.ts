import { describe, it, expect } from 'vitest'
import { decideSync, shouldMirror, type SyncInput } from '@/features/account/sync-decision'

const base: SyncInput = { pending: false, userId: null, owner: null, inFlight: false, localCount: 0 }
const decide = (over: Partial<SyncInput>) => decideSync({ ...base, ...over })

describe('decideSync', () => {
  it('waits while the session is pending, whatever else is stored', () => {
    expect(decide({ pending: true })).toBe('wait')
    expect(decide({ pending: true, owner: 'A', localCount: 3 })).toBe('wait')
  })

  it('merges on a fresh sign-in with local favorites and no owner', () => {
    expect(decide({ userId: 'A', localCount: 2 })).toBe('merge')
  })

  it('skips on reload with a live session already owning the local copy', () => {
    expect(decide({ userId: 'A', owner: 'A', localCount: 2 })).toBe('skip')
    expect(decide({ userId: 'A', owner: 'A', localCount: 0 })).toBe('skip')
  })

  it('clears a previous account mirror when known signed out', () => {
    expect(decide({ userId: null, owner: 'A', localCount: 2 })).toBe('clear')
  })

  it("leaves a signed-out user's own favorites alone", () => {
    expect(decide({ userId: null, owner: null, localCount: 2 })).toBe('skip')
  })

  it('merges when user B signs in over user A mirror', () => {
    expect(decide({ userId: 'B', owner: 'A', localCount: 2 })).toBe('merge')
  })

  it('marks owned without merging when there are no local favorites', () => {
    expect(decide({ userId: 'A', owner: null, localCount: 0 })).toBe('own')
  })

  it('skips while a merge for this user is already in flight', () => {
    expect(decide({ userId: 'A', inFlight: true, localCount: 2 })).toBe('skip')
  })
})

describe('shouldMirror', () => {
  it('mirrors only when the current user owns the local copy', () => {
    expect(shouldMirror('A', 'A')).toBe(true)
    expect(shouldMirror('A', null)).toBe(false)
    expect(shouldMirror('A', 'B')).toBe(false)
    expect(shouldMirror(null, null)).toBe(false)
  })
})
