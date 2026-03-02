/**
 * Minimal server for like/repost writes.
 *
 * Your developer app's bearer token lives on the server. Same bearer for all writes.
 * Client sends { userId, trackId, action }; server uses the developer app bearer + SDK.
 *
 * Env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN, PORT
 */
import 'dotenv/config'
import express from 'express'

const PORT = Number(process.env.PORT) || 3002
const apiKey = process.env.AUDIUS_API_KEY
const bearerToken = process.env.AUDIUS_BEARER_TOKEN
const appName = process.env.APP_NAME || 'like-repost'

if (!apiKey || !bearerToken) {
  console.error(
    'Set AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN in .env (from audius.co/settings → Developer Apps)'
  )
  process.exit(1)
}

const { sdk } = await import('@audius/sdk')
const audius = sdk({ appName, apiKey, bearerToken })

const app = express()
app.use(express.json())

// POST /like-repost — body: { userId, trackId, action: 'favorite' | 'unfavorite' | 'repost' | 'unrepost' }
app.post('/like-repost', async (req, res) => {
  const { userId, trackId, action } = req.body ?? {}
  if (!userId || !trackId || !action) {
    return res.status(400).json({ error: 'Missing userId, trackId, or action' })
  }
  const valid = ['favorite', 'unfavorite', 'repost', 'unrepost']
  if (!valid.includes(action)) {
    return res.status(400).json({ error: `action must be one of: ${valid.join(', ')}` })
  }
  try {
    if (action === 'favorite') {
      await audius.tracks.favoriteTrack({ userId, trackId })
    } else if (action === 'unfavorite') {
      await audius.tracks.unfavoriteTrack({ userId, trackId })
    } else if (action === 'repost') {
      await audius.tracks.repostTrack({ userId, trackId })
    } else {
      await audius.tracks.unrepostTrack({ userId, trackId })
    }
    return res.json({ success: true })
  } catch (e) {
    const status = e?.response?.status ?? 500
    const body = e?.response
      ? await e.response.text().catch(() => e?.message ?? 'Request failed')
      : (e?.message ?? 'Request failed')
    return res.status(status).json({ error: body || 'Request failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Like/repost server at http://localhost:${PORT}`)
})
