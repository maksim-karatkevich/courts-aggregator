import { describe, expect, it } from 'vitest'
import {
  parseClubSearch,
  parseSearchParams,
  toQueryString,
  toSearchParams,
} from '@/features/search/model/search-url'

const sp = (q: string) => new URLSearchParams(q)

describe('parseSearchParams', () => {
  it('parses a valid query', () => {
    expect(parseSearchParams(sp('date=2026-10-20&from=18:00&to=21:00&forMinutes=90'))).toEqual({
      date: '2026-10-20', from: '18:00', to: '21:00', forMinutes: 90,
    })
  })

  it('returns null for missing date, malformed from, or from >= to', () => {
    expect(parseSearchParams(sp('from=18:00&to=21:00'))).toBeNull()
    expect(parseSearchParams(sp('date=2026-10-20&from=6pm&to=21:00'))).toBeNull()
    expect(parseSearchParams(sp('date=2026-10-20&from=21:00&to=18:00'))).toBeNull()
    expect(parseSearchParams(sp('date=2026-10-20&from=18:00&to=18:00'))).toBeNull()
  })

  it.each(['2026-02-30', '2026-13-45', 'nope'])('returns null for impossible date %s', d => {
    expect(parseSearchParams(sp(`date=${d}&from=10:00&to=12:00`))).toBeNull()
  })

  it('defaults forMinutes to 60 when missing or not allowed', () => {
    expect(parseSearchParams(sp('date=2026-10-20&from=18:00&to=21:00'))?.forMinutes).toBe(60)
    expect(parseSearchParams(sp('date=2026-10-20&from=18:00&to=21:00&forMinutes=45'))?.forMinutes).toBe(60)
  })
})

describe('parseClubSearch', () => {
  const today = '2026-10-19'

  it('gives defaults with no params', () => {
    expect(parseClubSearch(sp(''), today)).toEqual({ date: today, window: null, forMinutes: 60 })
  })

  it('drops garbage or inverted windows', () => {
    expect(parseClubSearch(sp('from=x&to=y'), today).window).toBeNull()
    expect(parseClubSearch(sp('from=21:00&to=18:00'), today).window).toBeNull()
  })

  it('keeps a valid window and date, falls back on a bad date', () => {
    expect(parseClubSearch(sp('date=2026-10-25&from=18:00&to=21:00&forMinutes=120'), today)).toEqual({
      date: '2026-10-25', window: { from: '18:00', to: '21:00' }, forMinutes: 120,
    })
    expect(parseClubSearch(sp('date=nope'), today).date).toBe(today)
  })

  it.each(['2026-02-30', '2026-13-45', 'nope'])('falls back to today for impossible date %s', d => {
    expect(parseClubSearch(sp(`date=${d}`), today).date).toBe(today)
  })

  it('falls back to 60 minutes on a bad forMinutes', () => {
    expect(parseClubSearch(sp('forMinutes=45'), today).forMinutes).toBe(60)
    expect(parseClubSearch(sp('forMinutes=abc'), today).forMinutes).toBe(60)
  })
})

describe('toSearchParams / toQueryString', () => {
  it('fills a null window with 07:00-23:00', () => {
    expect(toSearchParams({ date: '2026-10-20', window: null, forMinutes: 60 })).toEqual({
      date: '2026-10-20', from: '07:00', to: '23:00', forMinutes: 60,
    })
  })

  it('round-trips through parseSearchParams', () => {
    const p = { date: '2026-10-20', from: '18:00', to: '21:00', forMinutes: 90 }
    expect(parseSearchParams(new URLSearchParams(toQueryString(p)))).toEqual(p)
  })
})
