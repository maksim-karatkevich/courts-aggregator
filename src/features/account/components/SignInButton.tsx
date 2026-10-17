'use client'

import { authClient } from '@/lib/auth-client'

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => void authClient.signIn.social({ provider: 'google' })}
      className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
    >
      Zaloguj się
    </button>
  )
}
