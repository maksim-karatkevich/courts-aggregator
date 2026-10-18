import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, insertUser } from './helpers/test-db'
import type { Db } from '@/db/schema'
import { parseClubKey } from '@/features/account/model/club-key'
import type { ClubRef } from '@/features/account/model/types'
import {
  addFavorite,
  getPreferences,
  mergeFavorites,
  recordBookingClick,
  removeFavorite,
} from '@/features/account/server/repo'

const a: ClubRef = { platform: 'tenis4u', clubId: '103' }
const b: ClubRef = { platform: 'twojtennis', clubId: 'abc' }

describe('parseClubKey', () => {
  it('parses platform and id', () => {
    expect(parseClubKey('tenis4u:103')).toEqual({ platform: 'tenis4u', clubId: '103' })
  })
  it('splits on the first colon only', () => {
    expect(parseClubKey('twojtennis:a:b')).toEqual({ platform: 'twojtennis', clubId: 'a:b' })
  })
  it('rejects unknown platform, empty id, missing colon', () => {
    expect(parseClubKey('foo:1')).toBeNull()
    expect(parseClubKey('tenis4u:')).toBeNull()
    expect(parseClubKey('tenis4u')).toBeNull()
  })
})

describe('account repo', () => {
  let db: Db
  beforeEach(async () => {
    db = await createTestDb()
    await insertUser(db, 'u1')
    await insertUser(db, 'u2')
  })

  it('addFavorite twice leaves one row', async () => {
    await addFavorite(db, 'u1', a)
    await addFavorite(db, 'u1', a)
    expect((await getPreferences(db, 'u1')).favorites).toEqual(['tenis4u:103'])
  })

  it('removeFavorite removes only that club', async () => {
    await addFavorite(db, 'u1', a)
    await addFavorite(db, 'u1', b)
    await removeFavorite(db, 'u1', a)
    expect((await getPreferences(db, 'u1')).favorites).toEqual(['twojtennis:abc'])
  })

  it('mergeFavorites unions without duplicates', async () => {
    await addFavorite(db, 'u1', a)
    const result = await mergeFavorites(db, 'u1', [a, b])
    expect([...result].sort()).toEqual(['tenis4u:103', 'twojtennis:abc'])
  })

  it('mergeFavorites with empty list keeps existing', async () => {
    await addFavorite(db, 'u1', a)
    expect(await mergeFavorites(db, 'u1', [])).toEqual(['tenis4u:103'])
  })

  it('recordBookingClick upserts and keeps latest time', async () => {
    const t1 = new Date('2026-10-01T10:00:00Z')
    const t2 = new Date('2026-10-02T10:00:00Z')
    await recordBookingClick(db, 'u1', a, 'Kort 1', t1)
    await recordBookingClick(db, 'u1', a, 'Kort 1', t2)
    const { booked } = await getPreferences(db, 'u1')
    expect(booked).toHaveLength(1)
    expect(booked[0].lastClickedAt).toBe(t2.toISOString())
  })

  it('a null court does not erase the remembered court', async () => {
    await recordBookingClick(db, 'u1', a, 'Kort 2', new Date('2026-10-01T10:00:00Z'))
    await recordBookingClick(db, 'u1', a, null, new Date('2026-10-02T10:00:00Z'))
    expect((await getPreferences(db, 'u1')).booked[0].lastCourt).toBe('Kort 2')
  })

  it('never leaks another user\'s rows', async () => {
    await addFavorite(db, 'u2', b)
    await recordBookingClick(db, 'u2', b, 'Kort 9')
    const p = await getPreferences(db, 'u1')
    expect(p).toEqual({ favorites: [], booked: [] })
  })

  it('orders booked newest first', async () => {
    await recordBookingClick(db, 'u1', a, null, new Date('2026-10-01T10:00:00Z'))
    await recordBookingClick(db, 'u1', b, null, new Date('2026-10-03T10:00:00Z'))
    expect((await getPreferences(db, 'u1')).booked.map((x) => x.club)).toEqual([
      'twojtennis:abc',
      'tenis4u:103',
    ])
  })
})
