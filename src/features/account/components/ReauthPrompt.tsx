'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

// Shown when deletion needs a fresh session: signs in again and returns to this page.
export function ReauthPrompt() {
  const [redirecting, setRedirecting] = useState(false)

  const reauth = async () => {
    setRedirecting(true)
    try {
      const res = await authClient.signIn.social({ provider: 'google', callbackURL: window.location.href })
      if (res.error) setRedirecting(false)
    } catch {
      setRedirecting(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <p className="text-xs text-red-600">Zaloguj się ponownie, aby usunąć konto</p>
      <button
        type="button"
        disabled={redirecting}
        onClick={() => void reauth()}
        className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
      >
        Zaloguj ponownie
      </button>
    </div>
  )
}
