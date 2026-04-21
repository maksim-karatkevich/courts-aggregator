import type { ClubCalendar, ClubResult, SearchParams, StationCalendar, TimeSlot } from '../types'
import { detectSurface } from './surface'

const BASE = '/api/tenis4u'

const COURT_IDS = [103, 110, 104, 344, 218, 205]

function toHHMM(timeStr: string): string {
  return timeStr?.slice(0, 5) ?? ''
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
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

      if (slotFromMin >= fromMin && slotToMin <= toMin && slotToMin - slotFromMin >= params.forMinutes) {
        slots.push({ from, to, courtName: station.name ?? undefined })
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
    COURT_IDS.map(async (courtId) => {
      const [occupancyResp, detailResp] = await Promise.all([
        fetch(`${BASE}/occupancy/${courtId}`),
        fetch(`${BASE}/court/${courtId}`),
      ])

      if (!occupancyResp.ok) return null

      const occupancy = await occupancyResp.json()
      const detail = detailResp.ok ? await detailResp.json() : {}

      const slots = extractSlots(occupancy, params)
      if (slots.length === 0) return null

      const name = detail.name ?? detail.clubName ?? `Kort ${courtId}`

      return {
        id: String(courtId),
        clubName: name,
        platform: 'tenis4u' as const,
        slots,
        bookingUrl: `https://app.tenis4u.pl/court/${courtId}`,
      }
    }),
  )

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map(r => (r as PromiseFulfilledResult<ClubResult | null>).value as ClubResult)
}
