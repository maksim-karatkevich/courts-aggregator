// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ClubResult } from '@/lib/types'
import type { CourtColumn } from '@/features/calendar/model/day-grid'
import { UNNAMED_COURT } from '@/features/club/group-by-court'

const recordBookingClick = vi.fn()
let lastBooked: { club: string; lastCourt: string | null }[] = []

vi.mock('@/features/account/hooks/use-preferences', () => ({
  usePreferences: () => ({ prefs: { favorites: [], booked: lastBooked }, signedIn: true, failed: false, ready: true }),
}))
vi.mock('@/features/account/hooks/use-record-booking-click', () => ({
  useRecordBookingClick: () => recordBookingClick,
}))
vi.mock('@/features/account/components/StarButton', () => ({
  StarButton: () => <button type="button">star</button>,
}))
vi.mock('@/features/account/model/ranking', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/account/model/ranking')>()),
  lastCourtFor: () => lastBooked[0]?.lastCourt ?? null,
}))

import { CalendarGrid } from '@/features/calendar/components/CalendarGrid'
import { CalendarLegend } from '@/features/calendar/components/CalendarLegend'
import { CalendarPanel } from '@/features/calendar/components/CalendarPanel'
import { CalendarEmptyState } from '@/features/calendar/components/CalendarEmptyState'

afterEach(() => {
  cleanup()
  recordBookingClick.mockReset()
  lastBooked = []
})

const free = (...hours: number[]) => Array.from({ length: 16 }, (_, i) => hours.includes(7 + i))
const columns: CourtColumn[] = [
  { name: 'Kort 1', surface: 'ceramiczny', free: free(8, 9) },
  { name: UNNAMED_COURT, free: free(10) },
]
const win = { from: '13:00', to: '17:00' }

function grid(w: typeof win | null = null, onBook = vi.fn()) {
  render(<CalendarGrid columns={columns} window={w} bookingUrl="https://x.test/b" onBook={onBook} resetKey="k" />)
  return onBook
}

describe('CalendarGrid', () => {
  it('renders court headers and 16 hour rows', () => {
    grid()
    expect(screen.getByText('Kort 1')).toBeTruthy()
    expect(screen.getByText('ceramiczny')).toBeTruthy()
    const rows = document.querySelectorAll('[data-hour]')
    expect(rows).toHaveLength(16)
    expect(screen.getByText('07:00')).toBeTruthy()
    expect(screen.getByText('22:00')).toBeTruthy()
  })

  it('free cells are external links, taken cells are not', () => {
    grid()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0].getAttribute('href')).toBe('https://x.test/b')
    expect(links[0].getAttribute('target')).toBe('_blank')
    expect(links[0].getAttribute('rel')).toContain('noopener')
  })

  it('click reports the court, null for unnamed', () => {
    const onBook = grid()
    const links = screen.getAllByRole('link')
    fireEvent.click(links[0])
    expect(onBook).toHaveBeenCalledWith('Kort 1')
    fireEvent.click(links[2])
    expect(onBook).toHaveBeenLastCalledWith(null)
  })

  it('marks rows overlapping the window', () => {
    grid(win)
    const marked = [...document.querySelectorAll('[data-in-window="true"]')]
    expect(marked.map(r => r.getAttribute('data-hour'))).toEqual(['13', '14', '15', '16'])
  })

  it('marks no rows without a window', () => {
    grid(null)
    expect(document.querySelectorAll('[data-in-window="true"]')).toHaveLength(0)
  })

  it('exposes the scroll container', () => {
    grid()
    expect(screen.getByTestId('calendar-scroll')).toBeTruthy()
  })
})

describe('CalendarLegend', () => {
  it('shows window item only with a window', () => {
    render(<CalendarLegend window={win} />)
    expect(screen.getByText('wolny')).toBeTruthy()
    expect(screen.getByText('zajęty')).toBeTruthy()
    expect(screen.getByText('Twoje okno 13:00 – 17:00')).toBeTruthy()
    cleanup()
    render(<CalendarLegend window={null} />)
    expect(screen.queryByText(/Twoje okno/)).toBeNull()
  })
})

const club: ClubResult = {
  id: 'c1', clubName: 'Hera', platform: 'tenis4u', slots: [], bookingUrl: 'https://hera.test/book',
  daySlots: [
    { from: '08:00', to: '10:00', courtName: 'Kort 1' },
    { from: '08:00', to: '10:00', courtName: 'Kort 2' },
  ],
}

describe('CalendarPanel', () => {
  it('shows name, date, hint and leading before the name', () => {
    render(<CalendarPanel club={club} date="2026-10-21" window={null} leading={<span>LEAD</span>} />)
    const name = screen.getByText('Hera')
    const lead = screen.getByText('LEAD')
    expect(lead.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText(/21.10.2026/)).toBeTruthy()
    expect(screen.getByText(/Kliknij zielone pole, aby zarezerwować/)).toBeTruthy()
  })

  it('Zarezerwuj link records a booking click', () => {
    render(<CalendarPanel club={club} date="2026-10-21" window={null} />)
    const link = screen.getByRole('link', { name: 'Zarezerwuj →' })
    expect(link.getAttribute('href')).toBe('https://hera.test/book')
    fireEvent.click(link)
    expect(recordBookingClick).toHaveBeenCalledWith({ platform: 'tenis4u', clubId: 'c1' }, null)
  })

  it('puts the last booked court first', () => {
    lastBooked = [{ club: 'x', lastCourt: 'Kort 2' }]
    render(<CalendarPanel club={club} date="2026-10-21" window={null} />)
    const headers = screen.getAllByText(/^Kort \d$/).map(e => e.textContent)
    expect(headers).toEqual(['Kort 2', 'Kort 1'])
  })
})

describe('CalendarEmptyState', () => {
  it('prompts to pick a club', () => {
    render(<CalendarEmptyState />)
    expect(screen.getByText('Wybierz klub z listy, aby zobaczyć dostępne terminy')).toBeTruthy()
  })
})
