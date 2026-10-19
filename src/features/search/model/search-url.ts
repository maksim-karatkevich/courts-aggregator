import { isValid, parseISO } from 'date-fns'
import { DURATIONS, type SearchParams, type SearchWindow } from '@/lib/types'

// Same patterns as /api/search, so a URL that parses here is accepted there.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Shape plus calendar validity: "2026-02-30" matches DATE_RE but is not a real day.
function isRealDate(date: string | null): date is string {
  return !!date && DATE_RE.test(date) && isValid(parseISO(date))
}

const TIME_RE = /^\d{2}:\d{2}$/

const DEFAULT_FROM = '07:00'
const DEFAULT_TO = '23:00'
const DEFAULT_MINUTES = 60

export interface ClubSearch {
  date: string
  window: SearchWindow | null
  forMinutes: number
}

function parseMinutes(raw: string | null): number {
  const n = Number(raw)
  return (DURATIONS as readonly number[]).includes(n) ? n : DEFAULT_MINUTES
}

// "HH:MM" strings of the same shape compare correctly as plain strings.
function parseWindow(from: string | null, to: string | null): SearchWindow | null {
  if (!from || !to || !TIME_RE.test(from) || !TIME_RE.test(to) || from >= to) return null
  return { from, to }
}

export function toQueryString(p: SearchParams): string {
  return new URLSearchParams({
    date: p.date,
    from: p.from,
    to: p.to,
    forMinutes: String(p.forMinutes),
  }).toString()
}

export function parseSearchParams(sp: URLSearchParams): SearchParams | null {
  const date = sp.get('date')
  const window = parseWindow(sp.get('from'), sp.get('to'))
  if (!isRealDate(date) || !window) return null
  return { date, ...window, forMinutes: parseMinutes(sp.get('forMinutes')) }
}

// Lenient variant for the club page: never throws, falls back field by field.
export function parseClubSearch(sp: URLSearchParams, today: string): ClubSearch {
  const date = sp.get('date')
  return {
    date: isRealDate(date) ? date : today,
    window: parseWindow(sp.get('from'), sp.get('to')),
    forMinutes: parseMinutes(sp.get('forMinutes')),
  }
}

export function toSearchParams(c: ClubSearch): SearchParams {
  return {
    date: c.date,
    from: c.window?.from ?? DEFAULT_FROM,
    to: c.window?.to ?? DEFAULT_TO,
    forMinutes: c.forMinutes,
  }
}
