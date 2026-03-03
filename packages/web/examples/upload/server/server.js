/**
 * Minimal server for track upload (create track).
 *
 * Your developer app's bearer token lives on the server. Client uploads audio
 * via SDK (gets trackCid), then sends { userId, metadata } here; server uses
 * developer app bearer to call createTrack.
 *
 * Env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN, PORT
 */
import 'dotenv/config'
import express from 'express'

const PORT = Number(process.env.PORT) || 3003
const apiKey = process.env.AUDIUS_API_KEY
const bearerToken = process.env.AUDIUS_BEARER_TOKEN
const appName = process.env.APP_NAME || 'upload-example'

if (!apiKey || !bearerToken) {
  console.error(
    'Set AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN in .env (from audius.co/settings → Developer Apps)'
  )
  process.exit(1)
}

const { sdk } = await import('@audius/sdk')
const audius = sdk({ appName, apiKey, bearerToken })

const app = express()
app.use(express.json({ limit: '1mb' }))

// CORS — allow Vite dev server (localhost:5173–5180) to call this server
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

// POST /create-track — body: { userId, metadata }
// metadata must include: title, genre, trackCid (from client's audio upload)
app.post('/create-track', async (req, res) => {
  const { userId, metadata } = req.body ?? {}
  if (!userId || !metadata) {
    return res.status(400).json({ error: 'Missing userId or metadata' })
  }
  if (!metadata.title || !metadata.genre || !metadata.trackCid) {
    return res.status(400).json({ error: 'metadata must include title, genre, trackCid' })
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
        description: metadata.description != null ? String(metadata.description) : null,
        duration,
        origFileCid: metadata.origFileCid != null ? String(metadata.origFileCid) : undefined,
        origFilename: metadata.origFilename != null ? String(metadata.origFilename) : undefined,
        coverArtCid: metadata.coverArtCid != null ? String(metadata.coverArtCid) : undefined,
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
      } catch {
        // keep body as e.message
      }
    }
    console.error('[create-track]', status, body, e?.response?.headers ? '(see response)' : '')
    return res.status(status).json({ error: body || 'Create track failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Upload server at http://localhost:${PORT}`)
})
