'use client'

import { authClient } from '@/lib/auth-client'
import { AccountMenu } from './AccountMenu'
import { SignInButton } from './SignInButton'

export function AccountButton() {
  const session = authClient.useSession()

  if (session.isPending) return <div className="h-8 w-8" aria-hidden />

  const user = session.data?.user
  return user ? <AccountMenu user={user} /> : <SignInButton />
}
