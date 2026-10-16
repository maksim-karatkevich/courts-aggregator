import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@/db/schema'
import type { Db } from '@/db/schema'

export async function createTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: 'drizzle' })
  return db
}

export async function insertUser(db: Db, id: string): Promise<void> {
  await db.insert(schema.user).values({
    id,
    name: `User ${id}`,
    email: `${id}@example.com`,
  })
}
