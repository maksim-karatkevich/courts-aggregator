import { describe, it, expect } from 'vitest'
import { deleteErrorKind } from '@/features/account/delete-error'

describe('deleteErrorKind', () => {
  it('asks for a fresh sign-in on SESSION_EXPIRED', () => {
    expect(
      deleteErrorKind({ code: 'SESSION_EXPIRED', message: 'Session expired.', status: 400, statusText: 'Bad Request' })
    ).toBe('reauth')
  })

  it('offers a retry for any other error', () => {
    expect(deleteErrorKind({ code: 'UNAUTHORIZED', status: 401, statusText: '' })).toBe('retry')
    expect(deleteErrorKind({ status: 500, statusText: 'Internal Server Error' })).toBe('retry')
    expect(deleteErrorKind(null)).toBe('retry')
    expect(deleteErrorKind(undefined)).toBe('retry')
    expect(deleteErrorKind('SESSION_EXPIRED')).toBe('retry')
  })
})
