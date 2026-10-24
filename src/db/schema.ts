import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { user } from './auth-schema'
import * as authSchema from './auth-schema'

export * from './auth-schema'

export const favorite = pgTable(
  'favorite',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    clubId: text('club_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.platform, t.clubId] })],
)

export const bookingPreference = pgTable(
  'booking_preference',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    clubId: text('club_id').notNull(),
    lastCourtName: text('last_court_name'),
    lastClickedAt: timestamp('last_clicked_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.platform, t.clubId] })],
)

// Only read through `typeof` to type Db, so lint sees it as unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const schema = { ...authSchema, favorite, bookingPreference }

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>
