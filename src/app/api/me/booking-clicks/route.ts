import { db } from '@/db'
import { bookingClickSchema } from '@/features/account/server/schemas'
import { getUserId } from '@/features/account/server/require-user'
import { recordBookingClick } from '@/features/account/server/repo'

export async function POST(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const parsed = bookingClickSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
  const { court, ...ref } = parsed.data
  await recordBookingClick(db, userId, ref, court ?? null)
  return new Response(null, { status: 204 })
}
