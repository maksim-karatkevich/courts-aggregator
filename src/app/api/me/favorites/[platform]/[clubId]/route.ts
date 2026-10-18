import { db } from '@/db'
import { clubRefSchema } from '@/features/account/server/schemas'
import { getUserId } from '@/features/account/server/require-user'
import { addFavorite, removeFavorite } from '@/features/account/server/repo'

type Ctx = { params: Promise<{ platform: string; clubId: string }> }

export async function PUT(request: Request, { params }: Ctx) {
  const userId = await getUserId(request)
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const ref = clubRefSchema.safeParse(await params)
  if (!ref.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
  await addFavorite(db, userId, ref.data)
  return new Response(null, { status: 204 })
}

export async function DELETE(request: Request, { params }: Ctx) {
  const userId = await getUserId(request)
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const ref = clubRefSchema.safeParse(await params)
  if (!ref.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
  await removeFavorite(db, userId, ref.data)
  return new Response(null, { status: 204 })
}
