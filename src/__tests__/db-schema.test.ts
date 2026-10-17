import { describe, it, expect } from 'vitest'
import { count, eq } from 'drizzle-orm'
import { bookingPreference, favorite, user } from '@/db/schema'
import { createTestDb, insertUser } from './helpers/test-db'

describe('db schema', () => {
  it('applies migrations to a fresh database', async () => {
    const db = await createTestDb()
    const [row] = await db.select({ n: count() }).from(favorite)
    expect(row.n).toBe(0)
  })

  it("deletes a user's favorites and booking preferences with the user", async () => {
    const db = await createTestDb()
    await insertUser(db, 'u1')
    await db.insert(favorite).values({ userId: 'u1', platform: 'tenis4u', clubId: 'c1' })
    await db
      .insert(bookingPreference)
      .values({ userId: 'u1', platform: 'tenis4u', clubId: 'c1', lastClickedAt: new Date() })

    await db.delete(user).where(eq(user.id, 'u1'))

    expect(await db.select().from(favorite).where(eq(favorite.userId, 'u1'))).toHaveLength(0)
    expect(
      await db.select().from(bookingPreference).where(eq(bookingPreference.userId, 'u1')),
    ).toHaveLength(0)
  })
})
