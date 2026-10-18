'use client'

import { useFavorites } from '../hooks/use-favorites'
import { clubKey } from '../model/club-key'
import type { ClubRef } from '../model/types'

export function StarButton({ club }: { club: ClubRef }) {
  const { isFavorite, toggle, ready } = useFavorites()
  const active = isFavorite(clubKey(club))

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label="Ulubione"
      disabled={!ready}
      onClick={() => toggle(club)}
      className={`shrink-0 text-lg leading-none transition-colors disabled:opacity-50 ${
        active ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
      }`}
    >
      {active ? '★' : '☆'}
    </button>
  )
}
