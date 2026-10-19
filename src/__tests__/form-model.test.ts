import { describe, expect, it } from 'vitest'
import { clampTo, minTo, quickPickDate, timeOptions } from '@/features/search/model/form-model'
import { format } from 'date-fns'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

describe('quickPickDate', () => {
  const wed = new Date(2026, 9, 21, 12)
  it('today / tomorrow / weekend from Wednesday', () => {
    expect(ymd(quickPickDate('today', wed))).toBe('2026-10-21')
    expect(ymd(quickPickDate('tomorrow', wed))).toBe('2026-10-22')
    expect(ymd(quickPickDate('weekend', wed))).toBe('2026-10-24')
  })
  it('weekend stays on Saturday and Sunday', () => {
    expect(ymd(quickPickDate('weekend', new Date(2026, 9, 24, 9)))).toBe('2026-10-24')
    expect(ymd(quickPickDate('weekend', new Date(2026, 9, 25, 9)))).toBe('2026-10-25')
  })
})

describe('timeOptions', () => {
  it('hourly', () => {
    const o = timeOptions(60)
    expect(o.slice(0, 2)).toEqual(['06:00', '07:00'])
    expect(o.at(-1)).toBe('23:00')
    expect(o).toHaveLength(18)
  })
  it('half-hourly', () => expect(timeOptions(30)).toHaveLength(35))
  it('merges kept values in order', () => {
    const o = timeOptions(60, ['13:30'])
    expect(o.indexOf('13:30')).toBe(o.indexOf('13:00') + 1)
    expect(o.indexOf('14:00')).toBe(o.indexOf('13:30') + 1)
  })
})

describe('minTo / clampTo', () => {
  it('minTo adds duration', () => expect(minTo('14:00', 90)).toBe('15:30'))
  it('clampTo raises an early to', () => expect(clampTo('14:30', '14:00', 120)).toBe('16:00'))
  it('clampTo keeps a late enough to', () => expect(clampTo('18:00', '14:00', 60)).toBe('18:00'))
})
