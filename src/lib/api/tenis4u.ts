import type { ClubCalendar, ClubResult, SearchParams, StationCalendar, TimeSlot } from '../types'
import { detectSurface } from './surface'

const BASE = '/api/tenis4u'

const COURT_IDS = [{id: 103, clubName: 'Sport Factory Park'}, {id: 204, clubName: 'SAO SPORTS HUB Piastowska'}, {id: 110, clubName: 'TCC Sport Resort KORTY'}, {id: 104, clubName: 'Fame Sport'}, {id: 344, clubName: 'KSU Grzegórzecki'}, { id: 218, clubName: 'Park Wola Sodowa'}, {id: 205, clubName: 'KS Grzegórzecki - Flex Wysłouchów 34'}]

function toHHMM(timeStr: string): string {
  return timeStr?.slice(0, 5) ?? ''
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSlots(occupancy: any, params: SearchParams): TimeSlot[] {
  const fromMin = timeToMinutes(params.from)
  const toMin = timeToMinutes(params.to)
  const slots: TimeSlot[] = []

  // params.date is "YYYY-MM-DD", response dates are "YYYY/MM/DD"
  const targetDate = params.date.replace(/-/g, '/')
  const stations: any[] = occupancy.stations ?? []

  for (const station of stations) {
    const day = (station.days ?? []).find((d: any) => d.date === targetDate)
    const freeHours: any[] = day?.free_hours ?? []
    for (const slot of freeHours) {
      const from = toHHMM(slot.begin_time ?? '')
      const to = toHHMM(slot.end_time ?? '')
      if (!from || !to) continue

      const slotFromMin = timeToMinutes(from)
      const slotToMin = timeToMinutes(to)

      const effectiveFrom = Math.max(slotFromMin, fromMin)
      const effectiveTo = Math.min(slotToMin, toMin)

      if (effectiveTo - effectiveFrom >= (params.forMinutes ?? 60)) {
        slots.push({ from: minutesToHHMM(effectiveFrom), to: minutesToHHMM(effectiveTo), courtName: station.name ?? undefined })
      }
    }
  }

  return slots
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAllDays(occupancy: any): StationCalendar[] {
  const stations: any[] = occupancy.stations ?? []
  return stations.map(station => ({
    stationId: String(station.id),
    stationName: station.name ?? `Kort ${station.id}`,
    surface: detectSurface(station.name ?? '', station.type ?? ''),
    days: (station.days ?? []).map((day: any) => ({
      date: (day.date ?? '').replace(/\//g, '-'),
      slots: (day.free_hours ?? []).map((h: any) => ({
        from: toHHMM(h.begin_time ?? ''),
        to: toHHMM(h.end_time ?? ''),
      })).filter((s: { from: string; to: string }) => s.from && s.to),
    })),
  }))
}

export async function getTenis4uCalendar(courtId: string, clubName: string): Promise<ClubCalendar> {
  const [occupancyResp] = await Promise.all([
    fetch(`${BASE}/occupancy/${courtId}`),
  ])
  if (!occupancyResp.ok) throw new Error(`Occupancy failed: ${occupancyResp.status}`)
  const occupancy = await occupancyResp.json()

  return {
    clubId: courtId,
    clubName,
    platform: 'tenis4u',
    bookingUrl: `https://app.tenis4u.pl/court/${courtId}`,
    stations: parseAllDays(occupancy),
  }
}

export async function searchTenis4u(params: SearchParams): Promise<ClubResult[]> {
  const results = await Promise.allSettled(
    COURT_IDS.map(async ({id, clubName}) => {
      const occupancyResp = await fetch(`${BASE}/occupancy/${id}`)
      if (!occupancyResp.ok) return null

      const occupancy = await occupancyResp.json()
      const slots = extractSlots(occupancy, params)
      if (slots.length === 0) return null

      return {
        id,
        clubName,
        platform: 'tenis4u' as const,
        slots,
        bookingUrl: `https://app.tenis4u.pl/court/${id}`,
      }
    }),
  )

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map(r => (r as PromiseFulfilledResult<ClubResult | null>).value as ClubResult)
}
