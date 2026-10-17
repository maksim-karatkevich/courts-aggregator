import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

export type SessionUser = typeof authClient.$Infer.Session.user
