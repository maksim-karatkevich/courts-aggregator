import type { SearchWindow, TimeSlot } from '@/lib/types'
import { groupByCourt } from '@/features/club/group-by-court'
import { orderCourts } from '@/features/account/model/ranking'
import { timeToMinutes } from '@/lib/api/slot-filter'

export const DAY_START_HOUR = 7
export const DAY_END_HOUR = 24

// free[i] is the hour DAY_START_HOUR + i
export interface CourtColumn { name: string; surface?: string; free: boolean[] }

const HOURS = DAY_END_HOUR - DAY_START_HOUR
const LAST_SEARCH_MINUTE = 23 * 60

// A span ending at or before its start (e.g. "00:00") wraps past midnight.
// Providers also write "open until midnight" as 23:59, which must still cover the 23:00 row.
function toRange(slot: TimeSlot): [number, number] {
  const start = timeToMinutes(slot.from)
  let end = timeToMinutes(slot.to)
  if (end <= start) end += 1440
  else if (end >= 23 * 60 + 59) end = 1440
  return [start, end]
}

// Merge touching spans first so 13:30-14:30 + 14:30-15:30 still frees hour 14.
function freeHours(slots: TimeSlot[]): boolean[] {
  const ranges = slots.map(toRange).sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return Array.from({ length: HOURS }, (_, i) => {
    const rowStart = (DAY_START_HOUR + i) * 60
    return merged.some(([start, end]) => start <= rowStart && end >= rowStart + 60)
  })
}

export function buildCourtColumns(daySlots: TimeSlot[], lastCourt: string | null): CourtColumn[] {
  const byCourt = groupByCourt(daySlots)
  const names = [...byCourt.keys()].sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }))
  return orderCourts(names, lastCourt).map(name => {
    const slots = byCourt.get(name)!
    return {
      name,
      surface: slots.find(s => s.surfaceType)?.surfaceType,
      free: freeHours(slots),
    }
  })
}

// Rows (hours) overlapping the search window, clamped to the visible day.
export function windowHours(window: SearchWindow | null): { first: number; last: number } | null {
  if (!window) return null
  const fromMin = timeToMinutes(window.from)
  const toMin = timeToMinutes(window.to)
  if (toMin <= fromMin) return null
  // The search form's latest end is 23:00, so a window reaching it covers the closing row too.
  const toEdge = toMin >= LAST_SEARCH_MINUTE ? 1440 : toMin
  const hours: number[] = []
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    if (h * 60 < toEdge && (h + 1) * 60 > fromMin) hours.push(h)
  }
  if (hours.length === 0) return null
  return { first: hours[0], last: hours[hours.length - 1] }
}

// One hour of context above the window, never before the day starts.
export function initialScrollHour(window: SearchWindow | null): number {
  const hours = windowHours(window)
  return hours ? Math.max(DAY_START_HOUR, hours.first - 1) : DAY_START_HOUR
}
