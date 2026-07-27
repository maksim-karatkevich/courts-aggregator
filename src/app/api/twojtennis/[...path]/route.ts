import { type NextRequest, NextResponse } from 'next/server'

const UPSTREAM = 'https://app-twojtenis-api-p-weu.azurewebsites.net'
const ORIGIN = 'https://app.twojtenis.pl'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${UPSTREAM}/${path.join('/')}${req.nextUrl.search}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Origin': ORIGIN,
      'Referer': `${ORIGIN}/`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
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
    },
    body,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
