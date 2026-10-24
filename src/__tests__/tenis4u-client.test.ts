import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { json, stubFetch } from './helpers/stub-fetch'
import occupancy103 from './fixtures/tenis4u/occupancy-103.json'
import occupancyEmpty from './fixtures/tenis4u/occupancy-empty.json'

// 'use cache' is just an unused string outside Next's compiler; cacheLife isn't.
vi.mock('next/cache', () => ({ cacheLife: () => {} }))

import { searchTenis4u } from '@/lib/api/tenis4u'

const CLUB_IDS = [103, 204, 110, 104, 344, 218, 205]
const params = { date: '2026-10-25', from: '07:00', to: '23:00', forMinutes: 60 }
const occupancyUrl = (id: number) => `https://api.tenis4u.pl/occupancy/${id}`

// Club 103 has a free court; every other club is empty unless a test overrides it.
function routes(overrides: Record<number, () => Response> = {}) {
  return Object.fromEntries(
    CLUB_IDS.map((id) => [occupancyUrl(id), overrides[id] ?? (() => json(id === 103 ? occupancy103 : occupancyEmpty))]),
  )
}

const club103 = {
  id: '103',
  clubName: 'Sport Factory Park',
  platform: 'tenis4u',
  slots: [{ from: '10:00', to: '13:00', courtName: 'Kort 1', surfaceType: 'hala mączka' }],
  daySlots: [{ from: '10:00', to: '13:00', courtName: 'Kort 1', surfaceType: 'hala mączka' }],
  bookingUrl: 'https://app.tenis4u.pl/court/103',
}

beforeEach(() => {
  stubFetch(routes())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchTenis4u', () => {
  it('requests occupancy for every known club with the tenis4u headers', async () => {
    const fetchMock = stubFetch(routes())
    await searchTenis4u(params)
    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls).toEqual(CLUB_IDS.map(occupancyUrl))
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).headers).toMatchObject({ 'X-Tenis-User-Agent': 'tenis4u-web-frontoffice/3.5.0' })
    }
  })

  it('maps a club with free slots for the searched date only', async () => {
    expect(await searchTenis4u(params)).toEqual([club103])
  })

  it('drops clubs with no slots', async () => {
    const ids = (await searchTenis4u(params)).map((c) => c.id)
    expect(ids).toEqual(['103'])
  })

  it('a club answering 500 does not drop the others', async () => {
    stubFetch(routes({ 204: () => json({}, 500) }))
    expect(await searchTenis4u(params)).toEqual([club103])
  })

  it('a 500 is never treated as data, even with a usable body', async () => {
    // Guards the res.ok check that keeps failures out of the 'use cache' entry.
    stubFetch(routes({ 103: () => json(occupancy103, 500) }))
    expect(await searchTenis4u(params)).toEqual([])
  })

  it('a network error on one club does not drop the others', async () => {
    stubFetch(routes({ 110: () => { throw new TypeError('fetch failed') } }))
    expect(await searchTenis4u(params)).toEqual([club103])
  })
})
