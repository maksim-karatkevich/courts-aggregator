import { useEffect, useRef, useState } from 'react'
import type { ClubCalendar, ClubResult, StationCalendar } from '../types'
import { getTenis4uCalendar } from '../api/tenis4u'
import { fetchTwojTennisDay, getClubLocationIds } from '../api/twojtennis'
import { surfaceColor } from '../api/surface'

const DAY_LABELS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function generateTimeBlocks(startHour = 7, endHour = 23): string[] {
  const blocks: string[] = []
  for (let t = startHour * 60; t < endHour * 60; t += 30) {
    const h = String(Math.floor(t / 60)).padStart(2, '0')
    const m = String(t % 60).padStart(2, '0')
    blocks.push(`${h}:${m}`)
  }
  return blocks
}

const TIME_BLOCKS = generateTimeBlocks()

function isAvailable(slots: { from: string; to: string }[], block: string): boolean {
  const blockMin = toMinutes(block)
  const blockEnd = blockMin + 30
  return slots.some(s => toMinutes(s.from) <= blockMin && toMinutes(s.to) >= blockEnd)
}

function formatDateTab(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    weekday: DAY_LABELS[d.getDay()],
    day: String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'),
  }
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function generateDates(fromDate: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(fromDate, i))
}

function WeekNav({
  onPrev,
  onNext,
  canPrev,
}: {
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
}) {
  return (
    <div className="week-nav">
      <button className="week-nav-btn" onClick={onPrev} disabled={!canPrev} aria-label="Poprzedni tydzień">
        ‹
      </button>
      <button className="week-nav-btn" onClick={onNext} aria-label="Następny tydzień">
        ›
      </button>
    </div>
  )
}

function CourtGrid({ stations, date }: { stations: StationCalendar[]; date: string }) {
  return (
    <div className="cal-scroll">
      <table className="cal-table">
        <thead>
          <tr>
            <th className="cal-time-col">Czas</th>
            {stations.map(s => {
              const c = surfaceColor(s.surface)
              return (
                <th key={s.stationId} className="cal-court-col-h" style={{ borderTop: `3px solid ${c.dot}` }}>
                  {s.stationName}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {TIME_BLOCKS.map(block => {
            const avail = stations.map(s => {
              const day = s.days.find(d => d.date === date)
              return day ? isAvailable(day.slots, block) : false
            })
            const anyFree = avail.some(Boolean)
            return (
              <tr key={block} className={anyFree ? '' : 'row-busy'}>
                <td className="cal-time-label">{block}</td>
                {avail.map((free, i) => (
                  <td key={i} className={`cal-cell-block ${free ? 'free' : 'busy'}`}>
                    {free && <span className="free-dot" />}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── TwojTennis lazy calendar ────────────────────────────────────────────────

type LocSlots = { from: string; to: string }[]

function buildTwojTennisStations(
  locationIds: string[],
  cache: Map<string, Map<string, LocSlots>>,
): StationCalendar[] {
  return locationIds.map((locId, idx) => ({
    stationId: locId,
    stationName: `Kort ${idx + 1}`,
    surface: 'Twarda',
    days: Array.from(cache.entries()).map(([date, dayMap]) => ({
      date,
      slots: dayMap.get(locId) ?? [],
    })),
  }))
}

function TwojTennisCalendar({
  club,
  initialDate,
  onBack,
}: {
  club: ClubResult
  initialDate: string
  onBack: () => void
}) {
  const locationIds = getClubLocationIds(club.id)
  const today = new Date().toISOString().slice(0, 10)
  const initialWeekStart = initialDate < today ? today : initialDate

  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [selectedDate, setSelectedDate] = useState(initialDate < today ? today : initialDate)
  const [dateLoading, setDateLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef<Map<string, Map<string, LocSlots>>>(new Map())
  const [, forceUpdate] = useState(0)

  const dates = generateDates(weekStart, 7)

  async function loadDate(date: string) {
    if (cache.current.has(date)) return
    setDateLoading(date)
    try {
      const dayMap = await fetchTwojTennisDay(club.id, date)
      cache.current.set(date, dayMap)
      forceUpdate(n => n + 1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setDateLoading(null)
    }
  }

  useEffect(() => { loadDate(selectedDate) }, [])

  async function handleSelectDate(date: string) {
    setSelectedDate(date)
    await loadDate(date)
  }

  function prevWeek() {
    const prev = addDays(weekStart, -7)
    const next = prev < today ? today : prev
    setWeekStart(next)
  }

  function nextWeek() {
    setWeekStart(addDays(weekStart, 7))
  }

  const canPrevWeek = weekStart > today

  const stations = buildTwojTennisStations(locationIds, cache.current)
  const isLoading = dateLoading !== null

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="back-btn" onClick={onBack}>← Wróć</button>
        <div className="calendar-title">
          <span className="calendar-club-name">{club.clubName}</span>
          <a href={club.bookingUrl} target="_blank" rel="noopener noreferrer"
            className="platform-badge platform-badge--twojtennis">
            TwojTenis
          </a>
        </div>
        <a href={club.bookingUrl} target="_blank" rel="noopener noreferrer" className="book-btn">
          Zarezerwuj kort
        </a>
      </div>

      {error && <div className="status error">{error}</div>}

      <div className="day-tabs-row">
        <WeekNav onPrev={prevWeek} onNext={nextWeek} canPrev={canPrevWeek} />
        <div className="day-tabs">
          {dates.map(date => {
            const { weekday, day } = formatDateTab(date)
            const past = date < today
            const loading = dateLoading === date
            return (
              <button
                key={date}
                className={`day-tab ${date === selectedDate ? 'active' : ''} ${isToday(date) ? 'today' : ''} ${past ? 'past' : ''}`}
                onClick={() => !past && handleSelectDate(date)}
                disabled={past || isLoading}
              >
                <span className="tab-weekday">{loading ? '…' : weekday}</span>
                <span className="tab-day">{day}</span>
              </button>
            )
          })}
        </div>
      </div>

      {cache.current.has(selectedDate) && stations.length > 0 && (
        <CourtGrid stations={stations} date={selectedDate} />
      )}
      {!cache.current.has(selectedDate) && !isLoading && (
        <div className="status">Brak danych dla tego dnia</div>
      )}
    </div>
  )
}

// ── Tenis4u calendar ────────────────────────────────────────────────────────

function Tenis4uCalendar({
  club,
  initialDate,
  onBack,
}: {
  club: ClubResult
  initialDate: string
  onBack: () => void
}) {
  const [calendar, setCalendar] = useState<ClubCalendar | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [activeSurfaces, setActiveSurfaces] = useState<Set<string>>(new Set())
  const [weekPage, setWeekPage] = useState(0)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    setLoading(true)
    getTenis4uCalendar(club.id, club.clubName)
      .then(cal => {
        cal.stations.forEach(s => s.days.sort((a, b) => a.date.localeCompare(b.date)))
        setCalendar(cal)
        const dates = cal.stations[0]?.days.map(d => d.date) ?? []
        const sel = dates.includes(initialDate) ? initialDate : (dates[0] ?? '')
        setSelectedDate(sel)
        // find which page the initial date is on
        const idx = dates.indexOf(sel)
        if (idx >= 0) setWeekPage(Math.floor(idx / 7))
        setActiveSurfaces(new Set(cal.stations.map(s => s.surface)))
      })
      .catch(e => setError(e.message ?? 'Błąd'))
      .finally(() => setLoading(false))
  }, [club.id])

  const allDates = calendar?.stations[0]?.days.map(d => d.date) ?? []
  const totalPages = Math.ceil(allDates.length / 7)
  const pageDates = allDates.slice(weekPage * 7, weekPage * 7 + 7)

  const surfaceCounts = new Map<string, number>()
  calendar?.stations.forEach(s => {
    surfaceCounts.set(s.surface, (surfaceCounts.get(s.surface) ?? 0) + 1)
  })

  function toggleSurface(surface: string) {
    setActiveSurfaces(prev => {
      const next = new Set(prev)
      if (next.has(surface)) {
        if (next.size > 1) next.delete(surface)
      } else {
        next.add(surface)
      }
      return next
    })
  }

  const visibleStations = calendar?.stations.filter(s => activeSurfaces.has(s.surface)) ?? []

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="back-btn" onClick={onBack}>← Wróć</button>
        <div className="calendar-title">
          <span className="calendar-club-name">{club.clubName}</span>
          <a href={club.bookingUrl} target="_blank" rel="noopener noreferrer"
            className="platform-badge platform-badge--tenis4u">
            Tenis4u
          </a>
        </div>
        <a href={club.bookingUrl} target="_blank" rel="noopener noreferrer" className="book-btn">
          Zarezerwuj kort
        </a>
      </div>

      {loading && <div className="status">Ładowanie kalendarza…</div>}
      {error && <div className="status error">{error}</div>}

      {calendar && (
        <>
          {surfaceCounts.size > 1 && (
            <div className="surface-filters">
              <span className="surface-filters-label">Nawierzchnia</span>
              <div className="surface-pills">
                {Array.from(surfaceCounts.entries()).map(([surface, count]) => {
                  const c = surfaceColor(surface)
                  const active = activeSurfaces.has(surface)
                  return (
                    <button
                      key={surface}
                      className={`surface-pill ${active ? 'active' : ''}`}
                      style={active ? { background: c.bg, color: c.text, borderColor: c.dot } : undefined}
                      onClick={() => toggleSurface(surface)}
                    >
                      <span className="surface-dot" style={{ background: active ? c.dot : '#cbd5e1' }} />
                      {surface}
                      <span className="surface-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="day-tabs-row">
            <WeekNav
              onPrev={() => setWeekPage(p => Math.max(0, p - 1))}
              onNext={() => setWeekPage(p => Math.min(totalPages - 1, p + 1))}
              canPrev={weekPage > 0}
            />
            <div className="day-tabs">
              {pageDates.map(date => {
                const { weekday, day } = formatDateTab(date)
                const past = date < today
                return (
                  <button
                    key={date}
                    className={`day-tab ${date === selectedDate ? 'active' : ''} ${isToday(date) ? 'today' : ''} ${past ? 'past' : ''}`}
                    onClick={() => !past && setSelectedDate(date)}
                    disabled={past}
                  >
                    <span className="tab-weekday">{weekday}</span>
                    <span className="tab-day">{day}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedDate && visibleStations.length > 0 && (
            <CourtGrid stations={visibleStations} date={selectedDate} />
          )}
        </>
      )}
    </div>
  )
}

// ── Public component ────────────────────────────────────────────────────────

interface Props {
  club: ClubResult
  initialDate: string
  onBack: () => void
}

export default function CalendarView({ club, initialDate, onBack }: Props) {
  if (club.platform === 'twojtennis') {
    return <TwojTennisCalendar club={club} initialDate={initialDate} onBack={onBack} />
  }
  return <Tenis4uCalendar club={club} initialDate={initialDate} onBack={onBack} />
}
