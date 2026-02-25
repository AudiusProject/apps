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

if (!apiKey || !bearerToken) {
  console.error('Set AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN in .env (from audius.co/settings → Developer Apps)')
  process.exit(1)
}

const { sdk } = await import('@audius/sdk')
const audius = sdk({ apiKey, bearerToken })

const app = express()
app.use(express.json())

// POST /update-description — body: { userId, description }
// Uses developer app bearer for all writes. userId = the user to update (must have authorized the app).
app.post('/update-description', async (req, res) => {
  const { userId, description } = req.body ?? {}
  if (!userId || description == null) {
    return res.status(400).json({ error: 'Missing userId or description' })
  }
  try {
    await audius.users.updateUser({
      id: userId,
      userId,
      metadata: { bio: String(description) }
    })
    return res.json({ success: true })
  } catch (e) {
    console.error(e)
    const status = e?.response?.status ?? 500
    const body = e?.response ? await e.response.text().catch(() => '') : e?.message ?? 'Unknown error'
    return res.status(status).json({ error: body || 'Update failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Authenticated writes server at http://localhost:${PORT}`)
  console.log('POST /update-description  body: { userId, description }')
})
