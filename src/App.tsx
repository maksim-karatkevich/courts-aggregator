import { useState, useEffect } from 'react'
import SearchForm from './components/SearchForm'
import ResultsView from './components/ResultsView'
import CalendarView from './components/CalendarView'
import { searchTwojTennis } from './api/twojtennis'
import { searchTenis4u } from './api/tenis4u'
import type { ClubResult } from './types'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULT_PARAMS = { from: '07:00', to: '23:00', forMinutes: 60 }

export default function App() {
  const [date, setDate] = useState(today())
  const [from, setFrom] = useState(DEFAULT_PARAMS.from)
  const [to, setTo] = useState(DEFAULT_PARAMS.to)
  const [results, setResults] = useState<ClubResult[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null)

  async function search(d: string, f: string, t: string) {
    setLoading(true)
    setErrors([])
    setResults([])

    const params = { date: d, from: f, to: t, forMinutes: DEFAULT_PARAMS.forMinutes }
    const [twResult, t4Result] = await Promise.allSettled([
      searchTwojTennis(params),
      searchTenis4u(params),
    ])

    const combined: ClubResult[] = []
    const errs: string[] = []

    if (twResult.status === 'fulfilled') combined.push(...twResult.value)
    else errs.push(`TwojTenis: ${twResult.reason?.message ?? 'Błąd połączenia'}`)

    if (t4Result.status === 'fulfilled') combined.push(...t4Result.value)
    else errs.push(`Tenis4u: ${t4Result.reason?.message ?? 'Błąd połączenia'}`)

    setResults(combined)
    setErrors(errs)
    setLoading(false)
  }

  useEffect(() => { search(today(), DEFAULT_PARAMS.from, DEFAULT_PARAMS.to) }, [])

  function handleDateChange(d: string) { setDate(d); search(d, from, to) }
  function handleFromChange(f: string) { setFrom(f); search(date, f, to) }
  function handleToChange(t: string) { setTo(t); search(date, from, t) }

  if (selectedClub) {
    return (
      <div className="app">
        <CalendarView club={selectedClub} initialDate={date} onBack={() => setSelectedClub(null)} />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Korty <span>Kraków</span></h1>
        <p className="subtitle">Dostępność kortów tenisowych w jednym miejscu</p>
      </header>
      <main>
        <SearchForm date={date} from={from} to={to} onDateChange={handleDateChange} onFromChange={handleFromChange} onToChange={handleToChange} loading={loading} />
        <ResultsView results={results} errors={errors} loading={loading} searched={true} onSelect={setSelectedClub} />
      </main>
    </div>
  )
}
