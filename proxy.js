// Minimal proxy — forwards /api/tenis4u/* and /api/twojtennis/* requests
// with correct Origin/Referer headers that the upstream APIs require.
import http from 'http'
import https from 'https'

const PORT = 3001

const ROUTES = {
  '/api/tenis4u': {
    host: 'api.tenis4u.pl',
    origin: 'https://app.tenis4u.pl',
    referer: 'https://app.tenis4u.pl/',
    stripPrefix: '/api/tenis4u',
    extraHeaders: { 'X-Tenis-User-Agent': 'tenis4u-web-frontoffice/3.5.0' },
  },
  '/api/twojtennis': {
    host: 'app-twojtenis-api-p-weu.azurewebsites.net',
    origin: 'https://app.twojtenis.pl',
    referer: 'https://app.twojtenis.pl/',
    stripPrefix: '/api/twojtennis',
    extraHeaders: {},
  },
  '/api/twojtennis-tech': {
    host: 'app-twojtenis-tech-krakow-api-p-weu.azurewebsites.net',
    origin: 'https://app.twojtenis.pl',
    referer: 'https://app.twojtenis.pl/',
    stripPrefix: '/api/twojtennis-tech',
    extraHeaders: {},
  },
}

function matchRoute(path) {
  const sorted = Object.entries(ROUTES).sort((a, b) => b[0].length - a[0].length)
  for (const [prefix, config] of sorted) {
    if (path.startsWith(prefix)) return { config, upstreamPath: path.slice(config.stripPrefix.length) || '/' }
  }
  return null
}

const server = http.createServer((req, res) => {
  // CORS headers for the browser
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const match = matchRoute(req.url ?? '/')
  if (!match) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const { config, upstreamPath } = match
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
    const body = chunks.length ? Buffer.concat(chunks) : null

    const options = {
      hostname: config.host,
      port: 443,
      path: upstreamPath,
      method: req.method,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': config.origin,
        'Referer': config.referer,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36',
        ...config.extraHeaders,
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    }

    const upstream = https.request(options, (upRes) => {
      res.writeHead(upRes.statusCode, { 'Content-Type': 'application/json' })
      upRes.pipe(res)
    })

    upstream.on('error', (err) => {
      console.error('Proxy error:', err.message)
      res.writeHead(502)
      res.end(JSON.stringify({ error: err.message }))
    })

    if (body) upstream.write(body)
    upstream.end()
  })
})

server.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`))
