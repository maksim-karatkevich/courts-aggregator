'use client'

import { useQuery } from '@tanstack/react-query'
import { SAVE_ERROR_KEY } from '../client/query-keys'

// True for a few seconds after any component's favorite save failed.
export function useFavoritesSaveError(): boolean {
  const { data } = useQuery<number | null>({
    queryKey: SAVE_ERROR_KEY,
    queryFn: () => null,
    initialData: null,
    staleTime: Infinity,
  })
  return data !== null
}
