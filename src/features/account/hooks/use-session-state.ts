'use client'

import { authClient } from '@/lib/auth-client'

export function useSessionState(): { userId: string | null; ready: boolean } {
  const session = authClient.useSession()
  return { userId: session.data?.user.id ?? null, ready: !session.isPending }
}
