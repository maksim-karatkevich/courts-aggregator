'use client'

import { useRef } from 'react'
import type { SearchWindow } from '@/lib/types'
import { UNNAMED_COURT } from '@/features/club/group-by-court'
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  initialScrollHour,
  windowHours,
  type CourtColumn,
} from '../model/day-grid'
import { useInitialScroll } from '../hooks/use-initial-scroll'

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)
const pad = (h: number) => `${String(h).padStart(2, '0')}:00`

export function CalendarGrid({
  columns,
  window,
  bookingUrl,
  onBook,
  resetKey,
  fill,
}: {
  columns: CourtColumn[]
  window: SearchWindow | null
  bookingUrl: string
  onBook: (court: string | null) => void
  resetKey: string
  fill?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useInitialScroll(scrollRef, initialScrollHour(window), resetKey)
  const range = windowHours(window)

  return (
    <div ref={scrollRef} data-testid="calendar-scroll" className={`relative overflow-auto rounded-lg border ${fill ? 'min-h-0 flex-1' : 'max-h-[28rem]'}`}>
      <div
        className="grid"
        style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(96px, 1fr))` }}
      >
        <div data-grid-header className="sticky left-0 top-0 z-20 border-b bg-background" />
        {columns.map(col => (
          <div key={col.name} className="sticky top-0 z-10 border-b bg-background px-2 py-1.5 text-center">
            <div className="text-xs font-semibold">{col.name}</div>
            {col.surface && <div className="text-[10px] text-muted-foreground">{col.surface}</div>}
          </div>
        ))}
        {HOURS.map(hour => {
          const inWindow = !!range && hour >= range.first && hour <= range.last
          const edge =
            inWindow && range
              ? `${hour === range.first ? 'border-t border-t-blue-500 ' : ''}${hour === range.last ? 'border-b border-b-blue-500' : ''}`
              : ''
          return (
            <div
              key={hour}
              className="contents"
            >
              <div
                data-hour={hour}
                data-in-window={inWindow ? 'true' : undefined}
                className={`sticky left-0 z-[5] px-2 py-1 text-right text-xs ${inWindow ? 'bg-blue-50 text-blue-600' : 'bg-background text-muted-foreground'} ${edge}`}
              >
                {pad(hour)}
              </div>
              {columns.map(col =>
                col.free[hour - DAY_START_HOUR] ? (
                  <a
                    key={col.name}
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${col.name} ${pad(hour)} wolny`}
                    onClick={() => onBook(col.name === UNNAMED_COURT ? null : col.name)}
                    className={`m-px h-8 rounded-sm bg-green-500 transition-colors hover:bg-green-600 ${edge}`}
                  />
                ) : (
                  <div key={col.name} className={`m-px h-8 rounded-sm ${inWindow ? 'bg-blue-50' : 'bg-muted/60'} ${edge}`} />
                ),
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
