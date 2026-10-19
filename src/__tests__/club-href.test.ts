import { describe, expect, it } from 'vitest'
import { clubHref } from '@/features/club/club-href'
import { parseClubSearch } from '@/features/search/model/search-url'

const p = { date: '2026-10-20', from: '18:00', to: '21:00', forMinutes: 90 }

describe('clubHref', () => {
  it('builds a twojtennis uuid link', () => {
    const id = '3f2b8c1e-1111-4a2b-9c3d-123456789abc'
    expect(clubHref({ platform: 'twojtennis', id }, p)).toBe(
      `/club/${id}?platform=twojtennis&date=2026-10-20&from=18%3A00&to=21%3A00&forMinutes=90`,
    )
  })

  it('encodes ids with spaces and round-trips through parseClubSearch', () => {
    const href = clubHref({ platform: 'tenis4u', id: 'Klub Test' }, p)
    expect(href.startsWith('/club/Klub%20Test?')).toBe(true)
    const sp = new URLSearchParams(href.split('?')[1])
    expect(sp.get('platform')).toBe('tenis4u')
    expect(parseClubSearch(sp, '2000-01-01')).toEqual({
      date: '2026-10-20',
      window: { from: '18:00', to: '21:00' },
      forMinutes: 90,
    })
  })
})
