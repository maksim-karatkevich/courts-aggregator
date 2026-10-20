import type { SearchParams, TimeSlot } from '../types'

// Pure filtering helpers shared by the provider modules. No Next.js imports,
// so this file can be unit tested directly.

// ─── Raw tenis4u shapes ────────────────────────────────────────────────────

export type RawFreeHour = { begin_time?: string; end_time?: string }
export type RawDay = { date?: string; free_hours?: RawFreeHour[] } // date: "YYYY/MM/DD"
export type RawStation = { id?: number; name?: string; type?: string; days?: RawDay[] }
export type RawOccupancy = { stations?: RawStation[] }

// ─── Raw twojtennis shapes ─────────────────────────────────────────────────

export type RawFreeSlot = { from: string; to: string }

export type LocationInfo = {
  name: string
  surfaceType?: string
  courtType?: string
}

// ─── Time helpers ──────────────────────────────────────────────────────────

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export function minutesToHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

// Clips a free span to the user's window. Returns null if what's left is
// shorter than the requested duration.
function clip(from: string, to: string, params: SearchParams): { from: string; to: string } | null {
  if (!from || !to) return null
  const effectiveFrom = Math.max(timeToMinutes(from), timeToMinutes(params.from))
  const effectiveTo = Math.min(timeToMinutes(to), timeToMinutes(params.to))
  if (effectiveTo - effectiveFrom < (params.forMinutes ?? 60)) return null
  return { from: minutesToHHMM(effectiveFrom), to: minutesToHHMM(effectiveTo) }
}

// Normalizes a free span to HH:MM without clipping. Null if an end is missing.
function normalize(from: string, to: string): { from: string; to: string } | null {
  if (!from || !to) return null
  return { from: minutesToHHMM(timeToMinutes(from)), to: minutesToHHMM(timeToMinutes(to)) }
}

// ─── Provider filters ──────────────────────────────────────────────────────

export function extractSlots(occupancy: RawOccupancy, params: SearchParams): TimeSlot[] {
  // params.date is "YYYY-MM-DD", response dates are "YYYY/MM/DD"
  const targetDate = params.date.replace(/-/g, '/')
  const slots: TimeSlot[] = []

  for (const station of occupancy.stations ?? []) {
    const day = (station.days ?? []).find((d) => d.date === targetDate)
    for (const slot of day?.free_hours ?? []) {
      const clipped = clip(slot.begin_time ?? '', slot.end_time ?? '', params)
      if (clipped) slots.push({ ...clipped, courtName: station.name, surfaceType: station.type })
    }
  }

  return slots
}

export function filterTwojTennisSlots(
  spans: Record<string, RawFreeSlot[]>,
  locationMap: Record<string, LocationInfo>,
  params: SearchParams,
): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (const [locId, locSlots] of Object.entries(spans)) {
    const info = locationMap[locId]
    for (const s of locSlots) {
      const clipped = clip(s.from, s.to, params)
      if (clipped) {
        slots.push({ ...clipped, courtName: info?.name, surfaceType: info?.surfaceType, courtType: info?.courtType })
      }
    }
  }

  return slots
}

// Every free span of the date, unclipped and without a duration filter.
export function extractDaySlots(occupancy: RawOccupancy, params: Pick<SearchParams, 'date'>): TimeSlot[] {
  const targetDate = params.date.replace(/-/g, '/')
  const slots: TimeSlot[] = []

  for (const station of occupancy.stations ?? []) {
    const day = (station.days ?? []).find((d) => d.date === targetDate)
    for (const slot of day?.free_hours ?? []) {
      const span = normalize(slot.begin_time ?? '', slot.end_time ?? '')
      if (span) slots.push({ ...span, courtName: station.name, surfaceType: station.type })
    }
  }

  return slots
}

export function filterTwojTennisDaySlots(
  spans: Record<string, RawFreeSlot[]>,
  locationMap: Record<string, LocationInfo>,
): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (const [locId, locSlots] of Object.entries(spans)) {
    const info = locationMap[locId]
    for (const s of locSlots) {
      const span = normalize(s.from, s.to)
      if (span) {
        slots.push({ ...span, courtName: info?.name, surfaceType: info?.surfaceType, courtType: info?.courtType })
      }
    }
  }

  return slots
}
