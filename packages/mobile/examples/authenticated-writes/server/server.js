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
const appName = process.env.APP_NAME || 'auth-example'

if (!apiKey || !bearerToken) {
  console.error(
    'Set AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN in .env (from audius.co/settings → Developer Apps)'
  )
  process.exit(1)
}

const { sdk } = await import('@audius/sdk')
// Provide appName to avoid SDK fetching developer app by apiKey (which can 404 if app not on prod)
const audius = sdk({ appName, apiKey, bearerToken })

// console.log({ appName, apiKey, bearerToken })

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
    const result = await audius.users.updateUser({
      id: userId,
      userId,
      metadata: { bio: String(description) }
    })
    const body = {
      success: true,
      transaction_hash: result?.transactionHash ?? result?.transaction_hash ?? null
    }
    console.log('[update-description] response body', JSON.stringify(body, null, 2))
    return res.json(body)
  } catch (e) {
    let body = e?.message ?? 'Unknown error'
    if (e?.response) {
      const resHeaders = Object.fromEntries(e.response.headers.entries())
      console.error('API response:', e.response.status, e.response.statusText)
      console.error('Response headers:', JSON.stringify(resHeaders, null, 2))
      if (e?.request) {
        const reqHeaders = e.request?.headers
          ? Object.fromEntries(e.request.headers.entries())
          : {}
        console.error('Request URL:', e.request?.url ?? e.response?.url)
        console.error('Request headers:', JSON.stringify(reqHeaders, null, 2))
      }
      body = await e.response.text().catch(() => body)
      if (body) console.error('Body:', body)
    } else {
      console.error(e)
    }
    const status = e?.response?.status ?? 500
    return res.status(status).json({ error: body || 'Update failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Authenticated writes server at http://localhost:${PORT}`)
  console.log('POST /update-description  body: { userId, description }')
})
