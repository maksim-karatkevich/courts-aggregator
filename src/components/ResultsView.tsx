import type { ClubResult, TimeSlot } from '../types'

function SlotRow({ slot }: { slot: TimeSlot }) {
  return (
    <div className="slot-row">
      <span className="slot-time">{slot.from}<span className="slot-sep">–</span>{slot.to}</span>
      {slot.courtName && <span className="slot-court">{slot.courtName}</span>}
      {slot.price && <span className="slot-price">{slot.price}</span>}
    </div>
  )
}

function ClubCard({ club, onSelect }: { club: ClubResult; onSelect: (club: ClubResult) => void }) {
  return (
    <div className="club-card" onClick={() => onSelect(club)} style={{ cursor: 'pointer' }}>
      <div className="club-header">
        <span className="club-name">{club.clubName}</span>
        <a
          href={club.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`platform-badge platform-badge--${club.platform}`}
        >
          {club.platform === 'twojtennis' ? 'TwojTenis' : 'Tenis4u'}
        </a>
      </div>
      <div className="slot-list">
        <div className="slot-list-header">
          <span>Godziny</span>
          <span>Kort</span>
          <span>Cena</span>
        </div>
        {club.slots.map((slot, i) => <SlotRow key={i} slot={slot} />)}
      </div>
    </div>
  )
}

interface Props {
  results: ClubResult[]
  errors: string[]
  loading: boolean
  searched: boolean
  onSelect: (club: ClubResult) => void
}

export default function ResultsView({ results, errors, loading, onSelect }: Props) {
  if (loading) return <div className="status">Wyszukuję korty…</div>

  const twojTennis = results.filter(r => r.platform === 'twojtennis')
  const tenis4u = results.filter(r => r.platform === 'tenis4u')
  const total = results.length

  return (
    <div className="results">
      {errors.length > 0 && (
        <div className="partial-error">
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {total > 0 && (
        <p className="results-meta">{total} {total === 1 ? 'klub' : 'klubów'} z wolnymi kortami</p>
      )}

      {total === 0 && errors.length === 0 && (
        <div className="status">Brak wolnych kortów w tym dniu.</div>
      )}

      {twojTennis.length > 0 && (
        <section>
          <h2 className="section-title">TwojTenis</h2>
          <div className="club-grid">
            {twojTennis.map(club => <ClubCard key={club.id} club={club} onSelect={onSelect} />)}
          </div>
        </section>
      )}

      {tenis4u.length > 0 && (
        <section>
          <h2 className="section-title">Tenis4u</h2>
          <div className="club-grid">
            {tenis4u.map(club => <ClubCard key={club.id} club={club} onSelect={onSelect} />)}
          </div>
        </section>
      )}
    </div>
  )
}
