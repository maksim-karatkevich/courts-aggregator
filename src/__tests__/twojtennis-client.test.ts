import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { json, stubFetch } from './helpers/stub-fetch'
import clubsSearch from './fixtures/twojtennis/clubs-search.json'
import clubA from './fixtures/twojtennis/club-a.json'
import freeslots from './fixtures/twojtennis/freeslots.json'

vi.mock('next/cache', () => ({ cacheLife: () => {} }))

import { searchTwojTennis } from '@/lib/api/twojtennis'

const API = 'https://app-twojtenis-api-p-weu.azurewebsites.net/api/v1'
const CLUBS_SEARCH = `${API}/Clubs/search`
const FREESLOTS = 'https://app-twojtenis-tech-krakow-api-p-weu.azurewebsites.net/api/v1/freeslots/search'
const params = { date: '2026-10-25', from: '07:00', to: '23:00', forMinutes: 60 }

type Routes = Parameters<typeof stubFetch>[0]
const routes = (overrides: Routes = {}): Routes => ({
  [CLUBS_SEARCH]: () => json(clubsSearch),
  [`${API}/Clubs/club-a`]: () => json(clubA),
  [`${API}/Clubs/club-b`]: () => json({ locations: [] }),
  [FREESLOTS]: () => json(freeslots),
  ...overrides,
})

const court = { from: '10:00', to: '13:00', courtName: 'Kort 1', surfaceType: 'Clay', courtType: 'Indoor' }
const klubA = {
  id: 'club-a',
  clubName: 'Klub A',
  platform: 'twojtennis',
  slots: [court],
  daySlots: [court],
  bookingUrl: 'https://app.twojtenis.pl/#/clubs/club-a?tab=bookings',
}

beforeEach(() => {
  stubFetch(routes())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchTwojTennis', () => {
  it('posts the clubs search for the date and region', async () => {
    const fetchMock = stubFetch(routes())
    await searchTwojTennis(params)
    const [, init] = fetchMock.mock.calls.find(([url]) => url === CLUBS_SEARCH)!
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toMatchObject({
      date: '2026-10-25',
      regionId: '31e247b1-1682-4e58-ba05-1bba6ca9ed23',
    })
  })

  it('maps a club with empty slots, court details from the location map', async () => {
    expect(await searchTwojTennis(params)).toEqual([klubA])
  })

  it('skips clubs without empty slots', async () => {
    const ids = (await searchTwojTennis(params)).map((c) => c.id)
    expect(ids).not.toContain('club-b')
  })

  it('missing club name falls back to Nieznany klub', async () => {
    const unnamed = { clubs: [{ ...freeslots.clubs[0], name: undefined }] }
    stubFetch(routes({ [FREESLOTS]: () => json(unnamed) }))
    const [club] = await searchTwojTennis(params)
    expect(club.clubName).toBe('Nieznany klub')
  })

  it('location detail failing keeps the slot without court details', async () => {
    stubFetch(routes({ [`${API}/Clubs/club-a`]: () => json({}, 500) }))
    const [club] = await searchTwojTennis(params)
    expect(club.slots).toEqual([{ from: '10:00', to: '13:00', courtName: undefined, surfaceType: undefined, courtType: undefined }])
    expect(club.slots[0]).not.toHaveProperty('courtName', 'Kort 1')
  })

  it('clubs search failing rejects', async () => {
    stubFetch(routes({ [CLUBS_SEARCH]: () => json({}, 500) }))
    await expect(searchTwojTennis(params)).rejects.toThrow(/twojtennis clubs: 500/)
  })

  it('freeslots returned as an array is unwrapped', async () => {
    stubFetch(routes({ [FREESLOTS]: () => json([freeslots]) }))
    expect(await searchTwojTennis(params)).toEqual([klubA])
  })
})
