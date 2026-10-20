import { searchTenis4u } from '@/lib/api/tenis4u'
import { searchTwojTennis } from '@/lib/api/twojtennis'
import { DURATIONS, type SearchParams } from '@/lib/types'
import { NextResponse } from 'next/server'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const date = searchParams.get('date') ?? ''
  const from = searchParams.get('from') ?? '07:00'
  const to = searchParams.get('to') ?? '23:00'
  const forMinutes = Number(searchParams.get('forMinutes') ?? 120)

  if (!DATE_RE.test(date) || !TIME_RE.test(from) || !TIME_RE.test(to) || !(DURATIONS as readonly number[]).includes(forMinutes)) {
    return NextResponse.json({ error: 'Invalid search params' }, { status: 400 })
  }

  const params: SearchParams = { date, from, to, forMinutes }

  // allSettled so one provider being down still returns the other's results
  const results = await Promise.allSettled([searchTenis4u(params), searchTwojTennis(params)])
  for (const r of results) {
    if (r.status === 'rejected') console.error('search provider failed:', r.reason)
  }

  return NextResponse.json(results.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])))
}
