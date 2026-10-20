'use client'

import type { ReactNode } from 'react'
import type { ClubResult, SearchWindow } from '@/lib/types'
import { StarButton } from '@/features/account/components/StarButton'
import { usePreferences } from '@/features/account/hooks/use-preferences'
import { useRecordBookingClick } from '@/features/account/hooks/use-record-booking-click'
import { lastCourtFor } from '@/features/account/model/ranking'
import { format, parseISO } from 'date-fns'
import { buildCourtColumns, initialScrollHour } from '../model/day-grid'
import { CalendarGrid } from './CalendarGrid'
import { CalendarLegend } from './CalendarLegend'

export function CalendarPanel({
  club,
  date,
  window,
  leading,
  page,
}: {
  club: ClubResult
  date: string
  window: SearchWindow | null
  leading?: ReactNode
  // Mobile club page: the grid is as tall as its content, capped to the screen.
  page?: boolean
}) {
  const { prefs } = usePreferences()
  const recordBookingClick = useRecordBookingClick()
  const ref = { platform: club.platform, clubId: club.id }
  const columns = buildCourtColumns(club.daySlots, lastCourtFor(club, prefs))

  return (
    <section className={`calendar-panel-in flex flex-col gap-3 rounded-xl border bg-card p-4`}>
      <header className={`flex gap-3 ${page ? 'flex-wrap items-center' : 'items-start'}`}>
        {leading}
        <div className={`min-w-0 ${page ? 'order-last w-full' : 'flex-1'}`}>
          <h2 className="text-xl font-bold leading-tight">{club.clubName}</h2>
          <p className="text-xs text-muted-foreground">
            {`${club.platform} · ${format(parseISO(date), 'dd.MM.yyyy')} · Kliknij zielone pole, aby zarezerwować`}
          </p>
        </div>
        <div className={page ? 'ml-auto' : ''}>
          <StarButton club={ref} />
        </div>
        <a
          href={club.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => recordBookingClick(ref, null)}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Zarezerwuj →
        </a>
      </header>
      <CalendarLegend window={window} />
      <CalendarGrid
        columns={columns}
        window={window}
        bookingUrl={club.bookingUrl}
        onBook={court => recordBookingClick(ref, court)}
        page={page}
        resetKey={`${club.platform}:${club.id}:${date}:${initialScrollHour(window)}`}
      />
    </section>
  )
}
