import type { ClubResult } from '../../src/lib/types'

// Names that can't exist in real data: if the mock ever misses and the app
// shows real results, every assertion on these names fails loudly.
const alfaSlots = [{ from: '10:00', to: '12:00', courtName: 'Kort 1', surfaceType: 'Mączka' }]
const betaSlots = [{ from: '18:00', to: '20:00', courtName: 'Kort A', surfaceType: 'Twarda' }]

export const alfa: ClubResult = {
  id: '901',
  clubName: 'E2E Klub Alfa',
  platform: 'tenis4u',
  slots: alfaSlots,
  daySlots: alfaSlots,
  bookingUrl: 'https://example.com/book/alfa',
}

export const beta: ClubResult = {
  id: 'e2e-beta',
  clubName: 'E2E Klub Beta',
  platform: 'twojtennis',
  slots: betaSlots,
  daySlots: betaSlots,
  bookingUrl: 'https://example.com/book/beta',
}

export const clubs: ClubResult[] = [alfa, beta]
