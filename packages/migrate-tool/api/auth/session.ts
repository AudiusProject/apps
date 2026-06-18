import type { VercelRequest, VercelResponse } from '@vercel/node'

import { getSessionFromRequest } from '../_lib/auth'

/** Return the current admin session (if any) for the signed-in user. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const session = await getSessionFromRequest(req)
  if (!session) {
    res.status(200).json({ email: null, name: null })
    return
  }
  res.status(200).json({ email: session.email, name: session.name ?? null })
}
