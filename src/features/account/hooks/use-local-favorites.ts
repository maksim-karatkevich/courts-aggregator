'use client'

import { useQuery } from '@tanstack/react-query'
import { readLocalFavorites } from '../client/local-favorites'
import { LOCAL_KEY } from '../client/query-keys'

// Signed-out favorites live in the query cache so every component using these hooks agrees.
// Server render has no localStorage, so data is undefined there and we fall back to [].
const NONE: string[] = []

export function useLocalFavorites(): string[] {
  const { data } = useQuery({
    queryKey: LOCAL_KEY,
    queryFn: () => readLocalFavorites(),
    staleTime: Infinity,
  })
  return data ?? NONE
}
