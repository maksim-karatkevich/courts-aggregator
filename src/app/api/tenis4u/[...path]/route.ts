import { type NextRequest, NextResponse } from 'next/server'

const UPSTREAM = 'https://api.tenis4u.pl'
const ORIGIN = 'https://app.tenis4u.pl'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${UPSTREAM}/${path.join('/')}${req.nextUrl.search}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Origin': ORIGIN,
      'Referer': `${ORIGIN}/`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
      'X-Tenis-User-Agent': 'tenis4u-web-frontoffice/3.5.0',
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${UPSTREAM}/${path.join('/')}${req.nextUrl.search}`
  const body = await req.text()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': ORIGIN,
      'Referer': `${ORIGIN}/`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
      'X-Tenis-User-Agent': 'tenis4u-web-frontoffice/3.5.0',
    },
    body,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
