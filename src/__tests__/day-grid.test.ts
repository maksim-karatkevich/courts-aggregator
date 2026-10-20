import { describe, it, expect } from 'vitest'
import { buildCourtColumns, windowHours, initialScrollHour, DAY_START_HOUR } from '@/features/calendar/model/day-grid'
import { UNNAMED_COURT } from '@/features/club/group-by-court'
import type { TimeSlot } from '@/lib/types'

const slot = (courtName: string | undefined, from: string, to: string, surfaceType?: string): TimeSlot =>
  ({ courtName, from, to, surfaceType })
const hoursFree = (free: boolean[]) => free.flatMap((f, i) => (f ? [DAY_START_HOUR + i] : []))

describe('buildCourtColumns', () => {
  it('marks only fully covered hours free', () => {
    const [col] = buildCourtColumns([slot('Kort 1', '13:00', '15:30')], null)
    expect(col.free).toHaveLength(17)
    expect(hoursFree(col.free)).toEqual([13, 14])
  })
  it('merges adjacent spans', () => {
    const [col] = buildCourtColumns([slot('Kort 1', '13:00', '14:00'), slot('Kort 1', '14:00', '15:00')], null)
    expect(hoursFree(col.free)).toEqual([13, 14])
  })
  it('treats 00:00 and 24:00 ends as midnight', () => {
    const cols = buildCourtColumns([slot('Kort 1', '21:00', '00:00'), slot('Kort 2', '21:00', '24:00')], null)
    for (const col of cols) expect(hoursFree(col.free)).toEqual([21, 22, 23])
  })
  it('orders courts naturally and puts the last court first', () => {
    const slots = [slot('Kort 2', '10:00', '11:00'), slot('Kort 10', '10:00', '11:00'), slot('Kort 1', '10:00', '11:00')]
    expect(buildCourtColumns(slots, null).map(c => c.name)).toEqual(['Kort 1', 'Kort 2', 'Kort 10'])
    expect(buildCourtColumns(slots, 'Kort 10').map(c => c.name)).toEqual(['Kort 10', 'Kort 1', 'Kort 2'])
  })
  it('groups unnamed slots into one column', () => {
    const cols = buildCourtColumns([slot(undefined, '10:00', '11:00'), slot(undefined, '12:00', '13:00')], null)
    expect(cols.map(c => c.name)).toEqual([UNNAMED_COURT])
  })
  it('uses the first non-empty surfaceType', () => {
    const [col] = buildCourtColumns([slot('Kort 1', '10:00', '11:00', ''), slot('Kort 1', '11:00', '12:00', 'clay'), slot('Kort 1', '12:00', '13:00', 'hard')], null)
    expect(col.surface).toBe('clay')
  })
  it('returns [] for empty input', () => {
    expect(buildCourtColumns([], null)).toEqual([])
  })
})

describe('windowHours', () => {
  it('covers overlapping rows', () => {
    expect(windowHours({ from: '13:00', to: '17:00' })).toEqual({ first: 13, last: 16 })
    expect(windowHours({ from: '13:30', to: '15:30' })).toEqual({ first: 13, last: 15 })
  })
  it('returns null for missing or empty windows', () => {
    expect(windowHours(null)).toBeNull()
    expect(windowHours({ from: '15:00', to: '15:00' })).toBeNull()
    expect(windowHours({ from: '17:00', to: '13:00' })).toBeNull()
  })
})

describe('initialScrollHour', () => {
  it('scrolls one hour before the window, clamped to the day start', () => {
    expect(initialScrollHour({ from: '13:00', to: '17:00' })).toBe(12)
    expect(initialScrollHour({ from: '07:00', to: '09:00' })).toBe(7)
    expect(initialScrollHour({ from: '08:00', to: '09:00' })).toBe(7)
    expect(initialScrollHour(null)).toBe(7)
  })
})
