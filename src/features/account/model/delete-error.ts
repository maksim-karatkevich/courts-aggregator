// Better Auth refuses /delete-user with code SESSION_EXPIRED when the session is older
// than freshAge (24h by default): the user must sign in again. Anything else is retryable.
export type DeleteErrorKind = 'reauth' | 'retry'

export function deleteErrorKind(error: unknown): DeleteErrorKind {
  if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'SESSION_EXPIRED') {
    return 'reauth'
  }
  return 'retry'
}
