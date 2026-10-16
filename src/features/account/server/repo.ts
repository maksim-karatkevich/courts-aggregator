import { and, desc, eq, sql } from 'drizzle-orm'
import { bookingPreference, favorite, type Db } from '@/db/schema'
import { clubKey, type ClubRef, type Preferences } from '../types'

export async function getPreferences(db: Db, userId: string): Promise<Preferences> {
  const favs = await db
    .select()
    .from(favorite)
    .where(eq(favorite.userId, userId))
    .orderBy(favorite.createdAt)
  const booked = await db
    .select()
    .from(bookingPreference)
    .where(eq(bookingPreference.userId, userId))
    .orderBy(desc(bookingPreference.lastClickedAt))
  return {
    favorites: favs.map((f) => clubKey({ platform: f.platform as ClubRef['platform'], clubId: f.clubId })),
    booked: booked.map((b) => ({
      club: clubKey({ platform: b.platform as ClubRef['platform'], clubId: b.clubId }),
      lastClickedAt: b.lastClickedAt.toISOString(),
      lastCourt: b.lastCourtName,
    })),
  }
}

export async function addFavorite(db: Db, userId: string, ref: ClubRef): Promise<void> {
  await db.insert(favorite).values({ userId, ...ref }).onConflictDoNothing()
}

export async function removeFavorite(db: Db, userId: string, ref: ClubRef): Promise<void> {
  await db
    .delete(favorite)
    .where(
      and(
        eq(favorite.userId, userId),
        eq(favorite.platform, ref.platform),
        eq(favorite.clubId, ref.clubId),
      ),
    )
}

export async function mergeFavorites(db: Db, userId: string, refs: ClubRef[]): Promise<string[]> {
  if (refs.length > 0) {
    await db
      .insert(favorite)
      .values(refs.map((r) => ({ userId, platform: r.platform, clubId: r.clubId })))
      .onConflictDoNothing()
  }
  return (await getPreferences(db, userId)).favorites
}

export async function recordBookingClick(
  db: Db,
  userId: string,
  ref: ClubRef,
  court: string | null,
  at: Date = new Date(),
): Promise<void> {
  await db
    .insert(bookingPreference)
    .values({ userId, ...ref, lastCourtName: court, lastClickedAt: at })
    .onConflictDoUpdate({
      target: [bookingPreference.userId, bookingPreference.platform, bookingPreference.clubId],
      set: {
        lastClickedAt: at,
        lastCourtName: sql`coalesce(excluded.last_court_name, ${bookingPreference.lastCourtName})`,
      },
    })
}
