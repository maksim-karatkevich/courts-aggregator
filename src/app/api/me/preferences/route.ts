import { db } from '@/db'
import { getUserId } from '@/features/account/server/require-user'
import { getPreferences } from '@/features/account/server/repo'

export async function GET(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await getPreferences(db, userId))
}
