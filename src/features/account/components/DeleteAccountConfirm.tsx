'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { deleteErrorKind, type DeleteErrorKind } from '../model/delete-error'
import { signOutAndClear } from '../hooks/sign-out'
import { ReauthPrompt } from './ReauthPrompt'

export function DeleteAccountConfirm({ onCancel, onDeleted }: { onCancel: () => void; onDeleted: () => void }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<DeleteErrorKind | null>(null)

  const deleteAccount = async () => {
    setBusy(true)
    setFailed(null)
    try {
      const res = await authClient.deleteUser()
      if (res.error) {
        setFailed(deleteErrorKind(res.error))
        return
      }
      await signOutAndClear(queryClient).catch(() => {})
      onDeleted()
    } catch {
      setFailed('retry')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs">Usunąć konto? Ulubione i historia rezerwacji zostaną trwale usunięte.</p>
      {failed === 'retry' && <p className="text-xs text-red-600">Nie udało się zapisać. Spróbuj ponownie.</p>}
      {failed === 'reauth' && <ReauthPrompt />}
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
          onClick={onCancel}
          className="rounded-md border px-2.5 py-1 text-xs font-medium"
        >
          Anuluj
        </button>
      </div>
    </div>
  )
}
