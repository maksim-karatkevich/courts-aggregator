'use client'

import { useAccountSync } from '../hooks/use-account-sync'

// Renders nothing; mounts the sign-in sync once, high in the tree.
export function AccountSync() {
  useAccountSync()
  return null
}
