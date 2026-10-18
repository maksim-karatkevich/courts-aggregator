import { describe, it, expect } from 'vitest'
import { toPreferences } from '@/features/account/model/preferences'

describe('toPreferences', () => {
  it('keeps a well-formed response', () => {
    const prefs = {
      favorites: ['tenis4u:1'],
      booked: [{ club: 'tenis4u:1', lastClickedAt: '2026-10-01T10:00:00Z', lastCourt: 'Kort 2' }],
    }
    expect(toPreferences(prefs)).toEqual(prefs)
  })

  it('defaults missing or non-array fields to empty arrays', () => {
    expect(toPreferences(null)).toEqual({ favorites: [], booked: [] })
    expect(toPreferences('oops')).toEqual({ favorites: [], booked: [] })
    expect(toPreferences({})).toEqual({ favorites: [], booked: [] })
    expect(toPreferences({ favorites: 'x', booked: { club: 'a' } })).toEqual({ favorites: [], booked: [] })
  })

  it('drops malformed entries and normalizes lastCourt', () => {
    expect(
      toPreferences({
        favorites: ['tenis4u:1', 42, null],
        booked: [
          null,
          { club: 'tenis4u:1' },
          { club: 'tenis4u:2', lastClickedAt: '2026-10-01T10:00:00Z' },
        ],
      })
    ).toEqual({
      favorites: ['tenis4u:1'],
      booked: [{ club: 'tenis4u:2', lastClickedAt: '2026-10-01T10:00:00Z', lastCourt: null }],
    })
  })
})
