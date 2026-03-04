/**
 * Minimal server for authenticated writes.
 *
 * Your developer app's bearer token lives on the server. Same bearer for all writes.
 * Client sends { userId, description }; server uses the developer app bearer + SDK.
 *
 * Env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN, PORT
 */
import 'dotenv/config'
import express from 'express'

const PORT = Number(process.env.PORT) || 3001
const apiKey = process.env.AUDIUS_API_KEY
const bearerToken = process.env.AUDIUS_BEARER_TOKEN
const appName = process.env.APP_NAME || 'update-profile'

if (!apiKey || !bearerToken) {
  console.error(
    'Set AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN in .env (from audius.co/settings → Developer Apps)'
  )
  process.exit(1)
}

const { sdk } = await import('@audius/sdk')
const audius = sdk({ appName, apiKey, bearerToken })
console.log(bearerToken)
console.log(apiKey)
console.log(appName)

const app = express()
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
app.use(express.json())

// POST /update-description — body: { userId, description }
// Uses developer app bearer for all writes. userId = the user to update (must have authorized the app).
app.post('/update-description', async (req, res) => {
  const { userId, description } = req.body ?? {}
  if (!userId || description == null) {
    return res.status(400).json({ error: 'Missing userId or description' })
  }
  try {
    const result = await audius.users.updateUser({
      id: userId,
      userId,
      metadata: { bio: String(description) }
    })
    return res.json({
      success: true,
      transaction_hash:
        result?.transactionHash ?? result?.transaction_hash ?? null
    })
  } catch (e) {
    const status = e?.response?.status ?? 500
    const body = e?.response
      ? await e.response.text().catch(() => e?.message ?? 'Update failed')
      : (e?.message ?? 'Update failed')
    return res.status(status).json({ error: body || 'Update failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Update-profile server running at http://localhost:${PORT}`)
})
