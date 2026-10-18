'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { postBookingClick } from '../client/api'
import { PREFS_KEY } from '../client/query-keys'
import type { ClubRef } from '../model/types'
import { useSessionState } from './use-session-state'

export function useRecordBookingClick(): (ref: ClubRef, court: string | null) => void {
  const queryClient = useQueryClient()
  const { userId, ready } = useSessionState()
  // Pending counts as maybe-signed-in: the server answers 401 if not, which is swallowed.
  const knownSignedOut = ready && userId === null

  return useCallback(
    (ref: ClubRef, court: string | null) => {
      if (knownSignedOut) return
      try {
        void postBookingClick(ref, court)
          .catch(() => {})
          .finally(() => {
            void queryClient.invalidateQueries({ queryKey: PREFS_KEY })
          })
      } catch {
        // never block the booking link
      }
    },
    [queryClient, knownSignedOut]
  )
}
