import type { ClubCalendar, ClubResult, SearchParams, TimeSlot } from '../types'
import { detectSurface } from './surface'

const FREESLOTS_URL = '/api/twojtennis-tech/api/v1/freeslots/search'
const TECH_GROUP_URL = 'https://app-twojtenis-tech-krakow-api-p-weu.azurewebsites.net'

const KRAKOW_CLUBS = [
  {
    id: 'b8431bee-80fe-435d-9f10-1f710a9ec003',
    name: 'Klub Testowy Kraków',
    isFavorite: false,
    closing: '23:00:00',
    locations: [
      { id: '9abdf242-cf80-49e7-94a6-3cc45adcc3db' },
      { id: 'cd40e5b9-ee98-4236-807f-5be925314cc0' },
      { id: 'ca7fe045-8e97-48bd-9d1f-cd77e8236ac5' },
    ],
  },
  {
    id: 'b992cf9b-e798-4a97-8593-345b4a92dc7d',
    name: 'Forehand Krakowska Akademia Tenisa',
    isFavorite: false,
    closing: '23:00:00',
    locations: [
      { id: 'c5a0e2c0-bf3b-453b-beb0-3037b419528f' },
      { id: '0e1dc3df-4dd0-42e4-8a45-3ee0bae69655' },
      { id: '48c46114-3b72-4e5d-9929-4ed7d85515fa' },
    ],
  },
  {
    id: '143a79c9-56d6-4c09-b84d-3d992aa690b5',
    name: 'Sport Klub Kryspinów',
    isFavorite: false,
    closing: '22:30:00',
    locations: [
      { id: 'a997d959-f3eb-4427-bbf5-05e7355a9419' },
      { id: 'a1c8a298-3d21-466f-853c-0a429e1df2d1' },
      { id: 'b4fe1cf4-66ff-4250-8103-c657d8f91aaa' },
      { id: '416f8ee1-6000-4200-941a-45bd1b5e78a4' },
      { id: 'f7ed5dc5-3558-4c91-9a97-6b7b3792dfa9' },
      { id: '0ae381ab-9b88-4c14-9bd5-f55c1618a1be' },
    ],
  },
  {
    id: 'ad2cb880-a5bc-41e8-a9d9-4cf79d77f794',
    name: 'Akademia Topsportu - Piaski Nowe',
    isFavorite: false,
    closing: '22:30:00',
    locations: [
      { id: 'ccef8246-776d-4e6b-b296-50dc05b3300d' },
      { id: '2686cd2f-7dba-4dfc-ab33-f3077fc77e24' },
    ],
  },
  {
    id: '89738c5a-717b-452d-a928-5c6d1e1fbb2c',
    name: 'Krakowski Klub Tenisowy Olsza',
    isFavorite: false,
    closing: '22:00:00',
    locations: [
      { id: 'f9200e89-0658-4c52-8a2c-2aad711c5252' },
      { id: 'ab423894-b7cc-4a83-930f-3a2b7e875977' },
      { id: '380b7026-a140-4ebc-beb8-3a4bd725d4cd' },
      { id: '21b8d82a-786a-4045-850f-77e067888397' },
      { id: '7af9348c-b2df-4499-b11a-7896284e05db' },
      { id: 'c8410a8b-a9f8-42c7-bf21-7e03d2b07621' },
      { id: 'f696091d-3e93-49d0-af54-86b06e7eeda4' },
      { id: '3e1b40cf-e7c8-441b-945f-8c71c5efb8c7' },
      { id: '27d9e47b-56f2-4436-811f-a51b205d2c50' },
      { id: 'c7523aa3-29f9-41bf-bda1-d147323abc44' },
    ],
  },
  {
    id: '02844bcf-8cb1-4db7-827c-676a45be453f',
    name: 'Klub Tenisowy Błonia Kraków',
    isFavorite: false,
    closing: '23:00:00',
    locations: [
      { id: '08b7fa2c-bf9f-491e-9e73-367c3eef565b' },
      { id: '74cf1cd9-2b6c-420e-94e4-9c0d3fd51ad6' },
      { id: '466ac974-bb5c-4a5f-85a5-a995e7bedef8' },
      { id: 'aae1d896-55ca-45d4-84b1-6e4602261816' },
      { id: 'aa413c81-dce4-4baa-9762-7c9ad8397d2a' },
      { id: '67a96b16-1c10-4523-a8a7-e04e4650439c' },
    ],
  },
  {
    id: '958662f0-0bd2-4fdc-8bef-bb2d69761adb',
    name: 'Błonia Sport',
    isFavorite: false,
    closing: '23:00:00',
    locations: [
      { id: '141eaa68-b92b-4034-9694-1c5640ef1beb' },
      { id: '54ceb415-862f-4518-8eb4-2c4a094b43ff' },
      { id: '118fd869-4748-49fc-be79-33070c070d7d' },
      { id: 'f629f2d9-01fe-4a61-b736-493203ed5bfe' },
      { id: '10813d74-a6d7-43f5-9b96-5116d2907021' },
      { id: '9a0d7b06-2fe2-415d-b32a-d5c9bb6c0958' },
      { id: 'b8db92ed-690b-4630-a800-f0c063c5ecd0' },
    ],
  },
  {
    id: '12b1b615-c7a4-4024-8cf7-dd42fdba44a1',
    name: 'WKS Wawel',
    isFavorite: false,
    closing: '22:00:00',
    locations: [
      { id: '292c82f1-0c76-4305-a887-0caa21a5b08f' },
      { id: 'eb3fac03-0c91-4ff8-b540-16c4ac41cb11' },
      { id: '5058001c-2df9-4876-8270-3b7badecbbe6' },
      { id: '42b7a425-240d-443f-8c5a-e39ecee71c37' },
      { id: '7fd879cb-dd28-4c14-ae9e-fbf324d118a4' },
    ],
  },
]

export function getClubLocationIds(clubId: string): string[] {
  return KRAKOW_CLUBS.find(c => c.id === clubId)?.locations.map(l => l.id) ?? []
}

function buildBody(date: string, from: string, _to: string, forMinutes: number) {
  return {
    technicalGroupUrl: TECH_GROUP_URL,
    date,
    forMinutes,
    clubs: KRAKOW_CLUBS.map(({ closing, ...club }) => ({
      ...club,
      locations: club.locations.map(loc => ({
        ...loc,
        from: `${from}:00`,
        to: closing,
      })),
    })),
    locationType: 0,
  }
}

async function fetchFreeslots(date: string, from: string, to: string, forMinutes: number) {
  const resp = await fetch(FREESLOTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(date, from, to, forMinutes)),
  })
  if (!resp.ok) throw new Error(`TwojTenis freeslots failed: ${resp.status}`)
  return resp.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeClubs(data: any): ClubResult[] {
  const clubs: any[] = data.clubs ?? []
  const results: ClubResult[] = []

  for (const club of clubs) {
    if (!club.containsEmptySlots) continue

    const slots: TimeSlot[] = []
    const spans: Record<string, { from: string; to: string }[]> = club.spans ?? {}

    for (const locSlots of Object.values(spans)) {
      for (const s of locSlots) {
        const from = s.from.slice(0, 5)
        const to = s.to.slice(0, 5)
        if (from && to) slots.push({ from, to })
      }
    }

    if (slots.length === 0) continue

    results.push({
      id: club.id,
      clubName: club.name ?? 'Nieznany klub',
      platform: 'twojtennis',
      slots,
      bookingUrl: `https://app.twojtenis.pl/#/clubs/${club.id}?tab=bookings`,
    })
  }

  return results
}

export async function searchTwojTennis(params: SearchParams): Promise<ClubResult[]> {
  const data = await fetchFreeslots(params.date, params.from, params.to, params.forMinutes)
  return normalizeClubs(data)
}

// Fetches one date for a specific club — returns locationId → slots
export async function fetchTwojTennisDay(
  clubId: string,
  date: string
): Promise<Map<string, { from: string; to: string }[]>> {
  const data = await fetchFreeslots(date, '07:00', '23:00', 60)
  const clubs: any[] = data.clubs ?? []
  const club = clubs.find((c: any) => c.id === clubId)
  if (!club?.containsEmptySlots) return new Map()
  const result = new Map<string, { from: string; to: string }[]>()
  for (const [locId, locSlots] of Object.entries(club.spans ?? {})) {
    result.set(locId, (locSlots as any[]).map((s: any) => ({
      from: s.from.slice(0, 5),
      to: s.to.slice(0, 5),
    })))
  }
  return result
}
