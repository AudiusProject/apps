import type { VercelRequest, VercelResponse } from '@vercel/node'
import { OAuth2Client } from 'google-auth-library'

import {
  createSessionToken,
  isAudiusEmail,
  serializeSessionCookie
} from '../_lib/auth'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

/**
 * Exchange a Google ID token for a session cookie. Only @audius.co /
 * @audius.org accounts are allowed. Mirrors the notifications-dashboard
 * /api/auth handler.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ error: 'Google OAuth not configured.' })
    return
  }

  const body = (req.body ?? {}) as { token?: string }
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) {
    res.status(400).json({ error: 'Missing token.' })
    return
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID)
  let payload: { email?: string; name?: string }
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    })
    payload = ticket.getPayload() ?? {}
  } catch (e) {
    console.error('Google token verification failed:', e)
    res.status(401).json({ error: 'Invalid token.' })
    return
  }

  const email = payload.email
  const name = payload.name
  if (!email || !name) {
    res.status(401).json({ error: 'Missing email or name.' })
    return
  }

  if (!isAudiusEmail(email)) {
    res.status(403).json({
      error: 'Only @audius.co and @audius.org accounts can access this tool.'
    })
    return
  }

  const sessionToken = await createSessionToken(email, name)
  res.setHeader('Set-Cookie', serializeSessionCookie(sessionToken))
  res.status(201).json({ email, name })
}
