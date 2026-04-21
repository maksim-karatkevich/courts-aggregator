function today() {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  date: string
  from: string
  to: string
  onDateChange: (date: string) => void
  onFromChange: (from: string) => void
  onToChange: (to: string) => void
  loading: boolean
}

export default function SearchForm({ date, from, to, onDateChange, onFromChange, onToChange, loading }: Props) {
  return (
    <div className="search-form">
      <div className="search-field search-field--date">
        <label htmlFor="date">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Data
        </label>
        <input
          id="date"
          type="date"
          value={date}
          min={today()}
          onChange={e => onDateChange(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="search-divider" />

      <div className="search-field">
        <label htmlFor="from">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Od
        </label>
        <input id="from" type="time" value={from} onChange={e => onFromChange(e.target.value)} disabled={loading} />
      </div>

      <div className="search-field">
        <label htmlFor="to">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Do
        </label>
        <input id="to" type="time" value={to} onChange={e => onToChange(e.target.value)} disabled={loading} />
      </div>

      {loading && <span className="loading-indicator">Szukam kortów…</span>}
    </div>
  )
}
