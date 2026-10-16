'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { signOutAndClear } from '../hooks'

export function AccountButton() {
  const queryClient = useQueryClient()
  const session = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpen(false)
    setConfirming(false)
    setDeleteFailed(false)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (session.isPending) return <div className="h-8 w-8" aria-hidden />

  const user = session.data?.user
  if (!user) {
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

  const initials = (user.name || user.email).trim().slice(0, 2).toUpperCase()

  const signOut = async () => {
    try {
      await signOutAndClear(queryClient)
    } catch {
      // local state is cleared regardless
    }
    close()
  }

  const deleteAccount = async () => {
    setBusy(true)
    setDeleteFailed(false)
    try {
      const res = await authClient.deleteUser()
      if (res.error) {
        setDeleteFailed(true)
        return
      }
      await signOutAndClear(queryClient).catch(() => {})
      close()
    } catch {
      setDeleteFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user.name || user.email}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border bg-background p-3 text-sm shadow-md">
          <p className="font-medium">{user.name}</p>
          <p className="mb-2 truncate text-xs text-muted-foreground">{user.email}</p>
          {confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs">Usunąć konto? Ulubione i historia rezerwacji zostaną trwale usunięte.</p>
              {deleteFailed && <p className="text-xs text-red-600">Nie udało się zapisać. Spróbuj ponownie.</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteAccount()}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Usuń
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setConfirming(false)
                    setDeleteFailed(false)
                  }}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1 border-t pt-2">
              <button type="button" onClick={() => void signOut()} className="hover:underline">
                Wyloguj
              </button>
              <button type="button" onClick={() => setConfirming(true)} className="text-red-600 hover:underline">
                Usuń konto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
