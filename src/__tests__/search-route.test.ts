import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Platform, type ClubResult } from '@/lib/types'

// Mock the provider modules, not fetch: this file tests only the route's own
// job (validation, defaults, merging, surviving a provider failure).
vi.mock('@/lib/api/tenis4u', () => ({ searchTenis4u: vi.fn() }))
vi.mock('@/lib/api/twojtennis', () => ({ searchTwojTennis: vi.fn() }))

import { GET } from '@/app/api/search/route'
import { searchTenis4u } from '@/lib/api/tenis4u'
import { searchTwojTennis } from '@/lib/api/twojtennis'

const tenis4u = vi.mocked(searchTenis4u)
const twojtennis = vi.mocked(searchTwojTennis)

const club = (platform: Platform, id: string): ClubResult => ({
  id,
  clubName: `Club ${id}`,
  platform,
  slots: [{ from: '10:00', to: '12:00', courtName: 'K1' }],
  daySlots: [{ from: '10:00', to: '12:00', courtName: 'K1' }],
  bookingUrl: `https://example.com/${id}`,
})
const a = club(Platform.Tenis4u, 'a')
const b = club(Platform.TwojTennis, 'b')

const get = (qs: string) => GET(new Request(`http://x/api/search?${qs}`))
const valid = 'date=2026-10-25&from=07:00&to=23:00&forMinutes=120'

let consoleError: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  tenis4u.mockReset().mockResolvedValue([])
  twojtennis.mockReset().mockResolvedValue([])
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  consoleError.mockRestore()
})

describe('validation', () => {
  it('400 for a malformed date', async () => {
    const res = await get('date=2026-1-5')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid search params' })
    expect(tenis4u).not.toHaveBeenCalled()
    expect(twojtennis).not.toHaveBeenCalled()
  })

  it('400 for bad from / to', async () => {
    expect((await get('date=2026-10-25&from=7:00')).status).toBe(400)
    expect((await get('date=2026-10-25&to=25')).status).toBe(400)
  })

  it('400 for a duration not in DURATIONS', async () => {
    expect((await get('date=2026-10-25&forMinutes=45')).status).toBe(400)
  })
})

describe('search', () => {
  it('applies defaults', async () => {
    await get('date=2026-10-25')
    const expected = { date: '2026-10-25', from: '07:00', to: '23:00', forMinutes: 120 }
    expect(tenis4u).toHaveBeenCalledWith(expected)
    expect(twojtennis).toHaveBeenCalledWith(expected)
  })

  it('merges both providers, tenis4u first', async () => {
    tenis4u.mockResolvedValue([a])
    twojtennis.mockResolvedValue([b])
    const res = await get(valid)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([a, b])
  })

  it('one provider down still returns the other', async () => {
    const boom = new Error('boom')
    tenis4u.mockRejectedValue(boom)
    twojtennis.mockResolvedValue([b])
    const res = await get(valid)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([b])
    expect(consoleError).toHaveBeenCalledWith('search provider failed:', boom)
  })

  it('both down returns an empty list', async () => {
    tenis4u.mockRejectedValue(new Error('x'))
    twojtennis.mockRejectedValue(new Error('y'))
    const res = await get(valid)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})
