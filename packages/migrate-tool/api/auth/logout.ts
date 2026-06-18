import type { VercelRequest, VercelResponse } from '@vercel/node'

import { clearSessionCookie } from '../_lib/auth'

/** Clear the admin session cookie. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  res.setHeader('Set-Cookie', clearSessionCookie())
  res.status(200).json({ ok: true })
}
