import { describe, it, expect } from 'vitest'
import { extractSlots, filterTwojTennisSlots } from '../lib/api/slot-filter'
import type { RawOccupancy, RawFreeSlot, LocationInfo } from '../lib/api/slot-filter'

const baseParams = {
  date: '2026-07-30',
  from: '09:00',
  to: '12:00',
  forMinutes: 60,
}

describe('extractSlots', () => {
  it('clips a free slot to the requested window', () => {
    const occupancy: RawOccupancy = {
      stations: [{
        name: 'Kort 1',
        type: 'Mączka',
        days: [{ date: '2026/07/30', free_hours: [{ begin_time: '08:00:00', end_time: '13:00:00' }] }],
      }],
    }
    expect(extractSlots(occupancy, baseParams)).toEqual([
      { from: '09:00', to: '12:00', courtName: 'Kort 1', surfaceType: 'Mączka' },
    ])
  })

  it('drops a slot shorter than forMinutes after clipping', () => {
    const occupancy: RawOccupancy = {
      stations: [{
        name: 'Kort 1',
        days: [{ date: '2026/07/30', free_hours: [{ begin_time: '11:30:00', end_time: '12:00:00' }] }],
      }],
    }
    expect(extractSlots(occupancy, baseParams)).toHaveLength(0)
  })

  it('respects a longer forMinutes', () => {
    const occupancy: RawOccupancy = {
      stations: [{
        name: 'Kort 1',
        days: [{ date: '2026/07/30', free_hours: [{ begin_time: '10:00:00', end_time: '11:30:00' }] }],
      }],
    }
    expect(extractSlots(occupancy, { ...baseParams, forMinutes: 90 })).toHaveLength(1)
    expect(extractSlots(occupancy, { ...baseParams, forMinutes: 120 })).toHaveLength(0)
  })

  it('ignores slots on a different date', () => {
    const occupancy: RawOccupancy = {
      stations: [{
        name: 'Kort 1',
        days: [{ date: '2026/07/31', free_hours: [{ begin_time: '09:00:00', end_time: '12:00:00' }] }],
      }],
    }
    expect(extractSlots(occupancy, baseParams)).toHaveLength(0)
  })

  it('handles missing stations gracefully', () => {
    expect(extractSlots({}, baseParams)).toEqual([])
  })
})

describe('filterTwojTennisSlots', () => {
  const locationMap: Record<string, LocationInfo> = {
    loc1: { name: 'Kort A', surfaceType: 'Clay', courtType: 'Indoor' },
  }

  it('clips a free span to the requested window', () => {
    const spans: Record<string, RawFreeSlot[]> = {
      loc1: [{ from: '08:00:00', to: '13:00:00' }],
    }
    expect(filterTwojTennisSlots(spans, locationMap, baseParams)).toEqual([
      { from: '09:00', to: '12:00', courtName: 'Kort A', surfaceType: 'Clay', courtType: 'Indoor' },
    ])
  })

  it('drops a span shorter than forMinutes after clipping', () => {
    const spans: Record<string, RawFreeSlot[]> = {
      loc1: [{ from: '11:30:00', to: '12:00:00' }],
    }
    expect(filterTwojTennisSlots(spans, locationMap, baseParams)).toHaveLength(0)
  })

  it('respects a longer forMinutes', () => {
    const spans: Record<string, RawFreeSlot[]> = {
      loc1: [{ from: '09:00:00', to: '10:30:00' }],
    }
    expect(filterTwojTennisSlots(spans, locationMap, { ...baseParams, forMinutes: 120 })).toHaveLength(0)
  })

  it('returns undefined court details when locationId not in map', () => {
    const spans: Record<string, RawFreeSlot[]> = {
      unknown: [{ from: '09:00:00', to: '12:00:00' }],
    }
    const slots = filterTwojTennisSlots(spans, {}, baseParams)
    expect(slots[0].courtName).toBeUndefined()
    expect(slots[0].surfaceType).toBeUndefined()
  })
})
