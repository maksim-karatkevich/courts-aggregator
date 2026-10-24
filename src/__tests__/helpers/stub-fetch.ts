import { vi, type Mock } from 'vitest'

type Handler = (init?: RequestInit) => Response | Promise<Response>

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Replaces global fetch with a router keyed by URL. A key matches when the
// request URL equals it, or starts with it followed by "?" (query strings).
// Exact matching keeps "/Clubs/search" and "/Clubs/<id>" from shadowing each
// other. Any URL without a route throws, so a test can never reach the network.
export function stubFetch(routes: Record<string, Handler>): Mock {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const key = Object.keys(routes).find((k) => url === k || url.startsWith(`${k}?`))
    if (!key) throw new Error(`Unmocked fetch: ${url}`)
    return routes[key](init)
  })
  vi.stubGlobal('fetch', mock)
  return mock
}
