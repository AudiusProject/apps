import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SignJWT, jwtVerify } from 'jose'

/**
 * Admin authentication for the migration tool.
 *
 * Mirrors the notifications-dashboard pattern: admins sign in with Google,
 * we verify the Google ID token, confirm the email is an Audius staff
 * address (@audius.co / @audius.org), and mint a short-lived signed-JWT
 * session cookie. Admin endpoints accept either that session cookie (the
 * UI path) or a static ADMIN_BEARER_TOKEN (an optional escape hatch for
 * programmatic/CLI access).
 */

const COOKIE_NAME = 'migrate-tool-session'
const DEFAULT_MAX_AGE = 60 * 60 * 24 // 24 hours

export function isAudiusEmail(email: string | null | undefined): boolean {
  return (
    !!email && (email.endsWith('@audius.co') || email.endsWith('@audius.org'))
  )
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SESSION_SECRET must be set and at least 32 characters (for JWT signing).'
    )
  }
  return new TextEncoder().encode(secret)
}

export type SessionUser = {
  email: string
  /** Google display name from login; may be absent on older cookies. */
  name?: string
}

export async function createSessionToken(
  email: string,
  name: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE
): Promise<string> {
  const secret = getSecret()
  const displayName = name.trim()
  return new SignJWT({
    email,
    ...(displayName ? { name: displayName } : {})
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secret)
}

export async function getSessionFromToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret)
    const email = payload.email as string | undefined
    if (!email || !isAudiusEmail(email)) return null
    const name = payload.name as string | undefined
    return { email, ...(name?.trim() ? { name: name.trim() } : {}) }
  } catch {
    return null
  }
}

/** Read and verify the session from an incoming Vercel request's cookies. */
export async function getSessionFromRequest(
  req: VercelRequest
): Promise<SessionUser | null> {
  const token = readCookie(req, COOKIE_NAME)
  if (!token) return null
  return getSessionFromToken(token)
}

export function getSessionCookieName(): string {
  return COOKIE_NAME
}

/** Serialize the session Set-Cookie header value. */
export function serializeSessionCookie(
  token: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE
): string {
  return buildCookie(COOKIE_NAME, token, maxAgeSeconds)
}

/** Serialize a Set-Cookie header value that clears the session cookie. */
export function clearSessionCookie(): string {
  return buildCookie(COOKIE_NAME, '', 0)
}

function buildCookie(
  name: string,
  value: string,
  maxAgeSeconds: number
): string {
  const parts = [
    `${name}=${value}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

/**
 * Read a cookie value. Vercel parses cookies onto req.cookies, but we fall
 * back to parsing the raw Cookie header so this works regardless of runtime.
 */
function readCookie(req: VercelRequest, name: string): string | undefined {
  const fromParsed = req.cookies?.[name]
  if (fromParsed) return fromParsed
  const header = req.headers.cookie
  if (!header) return undefined
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    if (key === name) return decodeURIComponent(pair.slice(idx + 1).trim())
  }
  return undefined
}

/**
 * Gate an admin endpoint. Authorizes if the caller has a valid Audius-staff
 * session cookie (the Google SSO UI path) OR presents the static
 * ADMIN_BEARER_TOKEN (optional escape hatch for programmatic access).
 *
 * Writes a 401 and returns false when neither is satisfied, so callers can
 * early-return:  if (!(await requireAdmin(req, res))) return
 */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<boolean> {
  // 1. Google SSO session cookie (admin UI).
  const session = await getSessionFromRequest(req)
  if (session) return true

  // 2. Static bearer token escape hatch (programmatic/CLI access). Optional.
  const expected = process.env.ADMIN_BEARER_TOKEN
  if (expected) {
    const header = req.headers.authorization ?? ''
    const match = /^Bearer\s+(.+)$/.exec(header)
    const token = match?.[1] ?? ''
    if (token && constantTimeEquals(token, expected)) return true
  }

  res.status(401).json({ error: 'Unauthorized.' })
  return false
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
