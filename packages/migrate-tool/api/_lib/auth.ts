import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Constant-time check that the incoming Authorization header matches the
 * admin bearer token. Returns true if authorized, otherwise writes a 401
 * response and returns false — callers can early-return.
 */
export function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  const expected = process.env.ADMIN_BEARER_TOKEN
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_BEARER_TOKEN not configured.' })
    return false
  }
  const header = req.headers.authorization ?? ''
  const match = /^Bearer\s+(.+)$/.exec(header)
  const token = match?.[1] ?? ''
  if (!constantTimeEquals(token, expected)) {
    res.status(401).json({ error: 'Unauthorized.' })
    return false
  }
  return true
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
