export const Platform = {
  Tenis4u: 'tenis4u',
  TwojTennis: 'twojtennis',
} as const

export type Platform = typeof Platform[keyof typeof Platform]

export interface SearchParams {
  date: string       // YYYY-MM-DD
  from: string       // HH:MM
  to: string         // HH:MM
  forMinutes: number
}

export interface TimeSlot {
  from: string       // HH:MM
  to: string         // HH:MM
  price?: string
  courtName?: string
  surfaceType?: string
  courtType?: string;
}

export interface ClubResult {
  id: string
  clubName: string
  platform: Platform
  slots: TimeSlot[]
  bookingUrl: string
}

export interface DaySlots {
  date: string  // YYYY-MM-DD
  slots: { from: string; to: string; price?: string }[]
}

export interface StationCalendar {
  stationId: string
  stationName: string
  surface: string   // e.g. "Hala · Mączka", "Twarda", …
  days: DaySlots[]
}

export interface ClubCalendar {
  clubId: string
  clubName: string
  platform: Platform
  bookingUrl: string
  stations: StationCalendar[]
}
