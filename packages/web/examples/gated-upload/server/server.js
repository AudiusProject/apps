/**
 * Gated upload server: create-track + geo-gated stream.
 *
 * - POST /create-track — same as upload example
 * - GET /stream/:trackId — geo-gate: only redirects to Audius stream if client
 *   IP is in allowed countries (from ip-api.com). Uses client-fetched public IP (ipify)
 *   resolution: we get client IP from the request, then fetch geo from ip-api.com.
 * - GET /my-region — returns { ip, country, city, allowed } for the requesting client
 *
 * Env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN, ALLOWED_COUNTRIES (comma-separated, default: United States)
 */
import 'dotenv/config'
import express from 'express'

const PORT = Number(process.env.PORT) || 3004
const apiKey = process.env.AUDIUS_API_KEY
const bearerToken = process.env.AUDIUS_BEARER_TOKEN
const appName = process.env.APP_NAME || 'gated-upload-example'
const allowedCountries = (process.env.ALLOWED_COUNTRIES || 'United States')
  .split(',')
  .map((s) => s.trim().toLowerCase())

if (!apiKey || !bearerToken) {
  console.error(
    'Set AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN in .env (from audius.co/settings → Developer Apps)'
  )
  process.exit(1)
}

const { sdk } = await import('@audius/sdk')
const audius = sdk({ appName, apiKey, bearerToken })

// Audius API base (production)
const AUDIUS_API_BASE = 'https://api.audius.co/v1'

function isLocalhost(ip) {
  if (!ip) return true
  const s = String(ip).trim()
  return s === '::1' || s === '127.0.0.1' || s.startsWith('::ffff:127.')
}

async function getGeoForIp(ip) {
  if (!ip || isLocalhost(ip)) {
    return { country: null, city: null }
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,city,status`
    )
    const data = await res.json()
    if (data.status === 'fail') return { country: null, city: null }
    return { country: data.country ?? null, city: data.city ?? null }
  } catch {
    return { country: null, city: null }
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress ?? req.ip ?? null
}

const app = express()
app.use(express.json({ limit: '1mb' }))

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

// GET /my-region — returns client's IP, country, city, and whether streaming is allowed.
// When request comes from localhost, client can pass ?ip= to use their public IP (e.g. from ipify).
app.get('/my-region', async (req, res) => {
  const reqIp = getClientIp(req)
  const clientIp =
    req.query.ip && typeof req.query.ip === 'string'
      ? req.query.ip.trim()
      : null
  // Use client-provided IP for geo when request is from localhost (local dev)
  const ipForGeo = isLocalhost(reqIp) && clientIp ? clientIp : reqIp
  const { country, city } = await getGeoForIp(ipForGeo)
  const allowed = country
    ? allowedCountries.includes(country.toLowerCase())
    : false
  return res.json({
    ip: reqIp,
    country: country ?? 'Unknown',
    city: city ?? null,
    allowed
  })
})

// GET /stream/:trackId — geo-gate: redirect to Audius stream URL only if allowed.
// When request is from localhost, client can pass ?client_ip= (from ipify) to use real IP for geo.
app.get('/stream/:trackId', async (req, res) => {
  const { trackId } = req.params
  if (!trackId) {
    return res.status(400).json({ error: 'Missing trackId' })
  }
  const reqIp = getClientIp(req)
  const clientIp =
    req.query.client_ip && typeof req.query.client_ip === 'string'
      ? req.query.client_ip.trim()
      : null
  const ipForGeo = isLocalhost(reqIp) && clientIp ? clientIp : reqIp
  const { country } = await getGeoForIp(ipForGeo)
  const allowed = country
    ? allowedCountries.includes(country.toLowerCase())
    : false

  if (!allowed) {
    return res.status(403).json({
      error: `Streaming only available in: ${allowedCountries.join(', ')}`,
      yourCountry: country ?? 'Unknown'
    })
  }

  const streamUrl = `${AUDIUS_API_BASE}/tracks/${encodeURIComponent(trackId)}/stream`
  return res.redirect(302, streamUrl)
})

// POST /create-track — same as upload example
app.post('/create-track', async (req, res) => {
  const { userId, metadata } = req.body ?? {}
  if (!userId || !metadata) {
    return res.status(400).json({ error: 'Missing userId or metadata' })
  }
  if (!metadata.title || !metadata.genre || !metadata.trackCid) {
    return res
      .status(400)
      .json({ error: 'metadata must include title, genre, trackCid' })
  }
  try {
    const duration =
      metadata.duration != null && Number(metadata.duration) > 0
        ? Number(metadata.duration)
        : undefined
    const result = await audius.tracks.createTrack({
      userId: String(userId),
      metadata: {
        title: String(metadata.title),
        genre: metadata.genre,
        trackCid: String(metadata.trackCid),
        description:
          metadata.description != null ? String(metadata.description) : null,
        accessAuthorities:
          metadata.accessAuthorities != null ? metadata.accessAuthorities : [],
        duration,
        origFileCid:
          metadata.origFileCid != null
            ? String(metadata.origFileCid)
            : undefined,
        origFilename:
          metadata.origFilename != null
            ? String(metadata.origFilename)
            : undefined,
        coverArtCid:
          metadata.coverArtCid != null
            ? String(metadata.coverArtCid)
            : undefined,
        isUnlisted: metadata.isUnlisted === true
      }
    })
    return res.json({
      success: true,
      trackId: result?.id ?? result?.track_id ?? result?.trackId ?? null
    })
  } catch (e) {
    const status = e?.response?.status ?? 500
    let body = e?.message ?? 'Create track failed'
    if (e?.response) {
      try {
        const text = await e.response.text()
        body = text || body
      } catch { }
    }
    return res.status(status).json({ error: body || 'Create track failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Gated-upload server at http://localhost:${PORT}`)
  console.log(`  Stream allowed in: ${allowedCountries.join(', ')}`)
})
