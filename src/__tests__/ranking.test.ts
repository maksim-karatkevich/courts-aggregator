import { describe, it, expect } from 'vitest'
import { rankClubs, orderCourts, lastCourtFor } from '@/features/account/model/ranking'
import { clubKey } from '@/features/account/model/club-key'
import { EMPTY_PREFERENCES } from '@/features/account/model/preferences'
import type { Preferences } from '@/features/account/model/types'
import { Platform, type ClubResult } from '@/lib/types'

function club(id: string, clubName: string, slotCount: number): ClubResult {
  return {
    id,
    clubName,
    platform: Platform.Tenis4u,
    slots: Array.from({ length: slotCount }, (_, i) => ({ from: `${13 + i}:00`, to: `${14 + i}:00` })),
    bookingUrl: `https://example.com/${id}`,
  }
}
const key = (id: string) => clubKey({ platform: Platform.Tenis4u, clubId: id })
const names = (cs: ClubResult[]) => cs.map(c => c.clubName)

const sportFactory = club('sf', 'Sport Factory', 2)
const hera = club('hera', 'Korty Hera', 1)
const tcc = club('tcc', 'TCC Sport', 6)
const wiosna = club('wiosna', 'Wiosna', 5)
const bulwary = club('bulwary', 'Bulwary', 3)
const all = [sportFactory, hera, tcc, wiosna, bulwary]

const prefs: Preferences = {
  favorites: [key('sf')],
  booked: [
    { club: key('hera'), lastClickedAt: '2026-10-12T10:00:00.000Z', lastCourt: 'Kort 2' },
    { club: key('tcc'), lastClickedAt: '2026-09-30T10:00:00.000Z', lastCourt: null },
  ],
}

describe('rankClubs', () => {
  it('splits favorites and orders the rest by booked recency then slots', () => {
    const { favorites, rest } = rankClubs(all, prefs)
    expect(names(favorites)).toEqual(['Sport Factory'])
    expect(names(rest)).toEqual(['Korty Hera', 'TCC Sport', 'Wiosna', 'Bulwary'])
  })

  it('with empty preferences orders purely by slot count', () => {
    const { favorites, rest } = rankClubs(all, EMPTY_PREFERENCES)
    expect(favorites).toEqual([])
    expect(names(rest)).toEqual(['TCC Sport', 'Wiosna', 'Bulwary', 'Sport Factory', 'Korty Hera'])
  })

  it('falls back to Polish alphabetical order on equal slots', () => {
    const a = club('a', 'Ćwiczebny', 2)
    const b = club('b', 'Cały', 2)
    expect(names(rankClubs([a, b], EMPTY_PREFERENCES).rest)).toEqual(['Cały', 'Ćwiczebny'])
  })

  it('puts a booked favorite first inside favorites', () => {
    const p: Preferences = {
      favorites: [key('wiosna'), key('hera')],
      booked: [{ club: key('hera'), lastClickedAt: '2026-10-12T10:00:00.000Z', lastCourt: null }],
    }
    expect(names(rankClubs(all, p).favorites)).toEqual(['Korty Hera', 'Wiosna'])
  })

  it('compares lastClickedAt as time, not as string', () => {
    const p: Preferences = {
      favorites: [],
      booked: [
        { club: key('hera'), lastClickedAt: '2026-10-12T12:00:00+02:00', lastCourt: null }, // 10:00Z
        { club: key('tcc'), lastClickedAt: '2026-10-12T11:00:00Z', lastCourt: null },
      ],
    }
    expect(names(rankClubs([hera, tcc], p).rest)).toEqual(['TCC Sport', 'Korty Hera'])
  })

  it('ignores favorite and booked keys that are not in the results', () => {
    const p: Preferences = {
      favorites: [key('ghost')],
      booked: [{ club: key('ghost2'), lastClickedAt: '2026-10-12T10:00:00.000Z', lastCourt: null }],
    }
    const { favorites, rest } = rankClubs([wiosna], p)
    expect(favorites).toEqual([])
    expect(names(rest)).toEqual(['Wiosna'])
  })

  it('does not mutate the input array', () => {
    const input = [...all]
    rankClubs(input, prefs)
    expect(input).toEqual(all)
  })
})

describe('orderCourts', () => {
  const courts = ['Kort 1', 'Kort 2', 'Kort 3']
  it('moves the last court to the front', () => {
    expect(orderCourts(courts, 'Kort 3')).toEqual(['Kort 3', 'Kort 1', 'Kort 2'])
  })
  it('leaves order unchanged for unknown, null or undefined', () => {
    expect(orderCourts(courts, 'Kort 9')).toEqual(courts)
    expect(orderCourts(courts, null)).toEqual(courts)
    expect(orderCourts(courts, undefined)).toEqual(courts)
  })
})

describe('lastCourtFor', () => {
  it('returns the stored court or null', () => {
    expect(lastCourtFor(hera, prefs)).toBe('Kort 2')
    expect(lastCourtFor(tcc, prefs)).toBeNull()
    expect(lastCourtFor(wiosna, prefs)).toBeNull()
  })
})
