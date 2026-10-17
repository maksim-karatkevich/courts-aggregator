'use client'

import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SessionUser } from '@/lib/auth-client'
import { useDismiss } from '@/hooks/use-dismiss'
import { signOutAndClear } from '../hooks'
import { DeleteAccountConfirm } from './DeleteAccountConfirm'
import { UserAvatar } from './UserAvatar'

export function AccountMenu({ user }: { user: SessionUser }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Closing unmounts DeleteAccountConfirm, which resets its error and busy state.
  const close = useCallback(() => {
    setOpen(false)
    setConfirming(false)
  }, [])
  useDismiss(root, open, close)

  const signOut = async () => {
    try {
      await signOutAndClear(queryClient)
    } catch {
      // local state is cleared regardless
    }
    close()
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={user.name || user.email}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold"
      >
        <UserAvatar user={user} />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border bg-background p-3 text-sm shadow-md">
          <p className="font-medium">{user.name}</p>
          <p className="mb-2 truncate text-xs text-muted-foreground">{user.email}</p>
          {confirming ? (
            <DeleteAccountConfirm onCancel={() => setConfirming(false)} onDeleted={close} />
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
