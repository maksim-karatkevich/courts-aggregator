import { db } from '@/db'
import { mergeSchema } from '@/features/account/schemas'
import { getUserId } from '@/features/account/server/require-user'
import { mergeFavorites } from '@/features/account/server/repo'
import { parseClubKey, type ClubRef } from '@/features/account/types'

export async function POST(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const parsed = mergeSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
  const refs = parsed.data.favorites.map((k) => parseClubKey(k) as ClubRef)
  return Response.json({ favorites: await mergeFavorites(db, userId, refs) })
}
