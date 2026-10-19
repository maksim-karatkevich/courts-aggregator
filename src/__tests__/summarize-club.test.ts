import { describe, expect, it } from 'vitest'
import { Platform, type ClubResult } from '@/lib/types'
import { formatCourtCount, formatSlotCount, summarizeClub } from '@/features/club/summarize-club'

function club(slots: ClubResult['slots']): ClubResult {
  return { id: 'c1', clubName: 'Klub', platform: Platform.Tenis4u, slots, daySlots: [], bookingUrl: 'https://x' }
}

describe('summarizeClub', () => {
  it('counts courts, surfaces, slots and the time range', () => {
    const result = summarizeClub(
      club([
        { from: '13:00', to: '14:00', courtName: 'Kort 1', surfaceType: 'Mączka' },
        { from: '14:00', to: '15:00', courtName: 'Kort 1', surfaceType: 'Mączka' },
        { from: '15:00', to: '16:00', courtName: 'Kort 2', surfaceType: 'Hala' },
      ]),
    )
    expect(result).toEqual({ courtCount: 2, surfaces: ['Hala', 'Mączka'], slotCount: 3, earliest: '13:00', latest: '16:00' })
  })

  it('counts unnamed courts as one and omits missing surfaces', () => {
    const result = summarizeClub(club([{ from: '10:00', to: '11:00' }, { from: '11:00', to: '12:00' }]))
    expect(result.courtCount).toBe(1)
    expect(result.surfaces).toEqual([])
  })
})

describe('formatCourtCount', () => {
  it.each([[1, '1 kort'], [2, '2 korty'], [4, '4 korty'], [5, '5 kortów'], [12, '12 kortów']])('%i -> %s', (n, s) => {
    expect(formatCourtCount(n)).toBe(s)
  })
})

describe('formatSlotCount', () => {
  it.each([
    [1, '1 wolny termin'],
    [2, '2 wolne terminy'],
    [4, '4 wolne terminy'],
    [5, '5 wolnych terminów'],
    [12, '12 wolnych terminów'],
    [22, '22 wolne terminy'],
  ])('%i -> %s', (n, expected) => {
    expect(formatSlotCount(n)).toBe(expected)
  })
})
