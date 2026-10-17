import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '@/db/schema'
import { favorite } from '@/db/schema'
import { createTestDb, insertUser } from './helpers/test-db'

const holder = vi.hoisted(() => ({
  db: null as Db | null,
  session: null as { user: { id: string } } | null,
}))

vi.mock('@/db', () => ({
  get db() {
    return holder.db
  },
}))
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: async () => holder.session } },
}))

import { GET as getPrefs } from '@/app/api/me/preferences/route'
import { PUT, DELETE } from '@/app/api/me/favorites/[platform]/[clubId]/route'
import { POST as merge } from '@/app/api/me/favorites/merge/route'
import { POST as click } from '@/app/api/me/booking-clicks/route'

const params = (platform: string, clubId: string) => ({ params: Promise.resolve({ platform, clubId }) })
const post = (url: string, body: unknown) =>
  new Request(`http://x${url}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) })
const req = (method: string) => new Request('http://x/api/me', { method })

beforeEach(async () => {
  holder.db = await createTestDb()
  await insertUser(holder.db, 'u1')
  await insertUser(holder.db, 'u2')
  holder.session = { user: { id: 'u1' } }
})

describe('signed out', () => {
  beforeEach(() => {
    holder.session = null
  })
  it('returns 401 from every handler', async () => {
    expect((await getPrefs(req('GET'))).status).toBe(401)
    expect((await PUT(req('PUT'), params('tenis4u', '1'))).status).toBe(401)
    expect((await DELETE(req('DELETE'), params('tenis4u', '1'))).status).toBe(401)
    expect((await merge(post('/m', { favorites: [] }))).status).toBe(401)
    expect((await click(post('/c', { platform: 'tenis4u', clubId: '1' }))).status).toBe(401)
  })
})

describe('validation', () => {
  it('PUT with unknown platform is 400', async () => {
    expect((await PUT(req('PUT'), params('foo', '1'))).status).toBe(400)
  })
  it('booking click with 65-char court is 400', async () => {
    const res = await click(post('/c', { platform: 'tenis4u', clubId: '1', court: 'x'.repeat(65) }))
    expect(res.status).toBe(400)
  })
  it('malformed JSON is 400', async () => {
    expect((await click(post('/c', '{nope'))).status).toBe(400)
    expect((await merge(post('/m', '{nope'))).status).toBe(400)
  })
  it('merge with 201 keys is 400', async () => {
    const favorites = Array.from({ length: 201 }, (_, i) => `tenis4u:${i}`)
    expect((await merge(post('/m', { favorites }))).status).toBe(400)
  })
  it('merge with an over-long club id is 400 and writes nothing', async () => {
    const res = await merge(post('/m', { favorites: ['tenis4u:' + 'x'.repeat(65)] }))
    expect(res.status).toBe(400)
    expect(await holder.db!.select().from(favorite)).toHaveLength(0)
  })
  it('merge with an invalid key is 400 and writes nothing', async () => {
    const res = await merge(post('/m', { favorites: ['tenis4u:1', 'bad'] }))
    expect(res.status).toBe(400)
    expect(await holder.db!.select().from(favorite)).toHaveLength(0)
  })
})

describe('signed in', () => {
  it('PUT then GET returns the favorite; DELETE removes it', async () => {
    const put = await PUT(req('PUT'), params('tenis4u', '103'))
    expect(put.status).toBe(204)
    expect(put.body).toBeNull()
    const prefs = await (await getPrefs(req('GET'))).json()
    expect(prefs.favorites).toContain('tenis4u:103')
    expect((await DELETE(req('DELETE'), params('tenis4u', '103'))).status).toBe(204)
    expect((await (await getPrefs(req('GET'))).json()).favorites).toEqual([])
  })
  it('merge returns the combined list', async () => {
    await PUT(req('PUT'), params('tenis4u', '1'))
    const res = await merge(post('/m', { favorites: ['twojtennis:7'] }))
    expect(res.status).toBe(200)
    expect((await res.json()).favorites.sort()).toEqual(['tenis4u:1', 'twojtennis:7'])
  })
  it('booking click is recorded', async () => {
    const res = await click(post('/c', { platform: 'tenis4u', clubId: '103', court: 'Kort 1' }))
    expect(res.status).toBe(204)
    const prefs = await (await getPrefs(req('GET'))).json()
    expect(prefs.booked[0]).toMatchObject({ club: 'tenis4u:103', lastCourt: 'Kort 1' })
  })
  it('ignores a userId in the body', async () => {
    await click(post('/c', { platform: 'tenis4u', clubId: '9', userId: 'u2' }))
    holder.session = { user: { id: 'u2' } }
    expect((await (await getPrefs(req('GET'))).json()).booked).toEqual([])
    holder.session = { user: { id: 'u1' } }
    expect((await (await getPrefs(req('GET'))).json()).booked).toHaveLength(1)
  })
})
