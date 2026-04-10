import type { UserMetadata } from '@audius/common/models'
import { OptionalId } from '@audius/sdk'

import { env } from 'app/services/env'
import { audiusSdk } from 'app/services/sdk/audius-sdk'

// ─── URL / key validation ─────────────────────────────────────────────────────

export const isValidApiKey = (key: string) => {
  const normalized = key.toLowerCase().startsWith('0x') ? key.slice(2) : key
  if (normalized.length !== 40) return false
  return /^[0-9a-fA-F]+$/.test(normalized)
}

export const getIsRedirectValid = (
  redirectUri: string | null | undefined
): boolean => {
  if (!redirectUri || typeof redirectUri !== 'string') return false
  try {
    const parsed = new URL(decodeURIComponent(redirectUri))
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:']
    if (dangerousSchemes.includes(parsed.protocol)) return false
    if (parsed.hash || parsed.username || parsed.password) return false
    if (
      parsed.pathname.includes('/..') ||
      parsed.pathname.includes('\\..') ||
      parsed.pathname.includes('../')
    )
      return false
    return true
  } catch {
    return false
  }
}

/** Collapse compound scopes like "read write" to the highest privilege. */
export const collapseScope = (
  raw: string | string[] | (string | null)[] | null | undefined
): string | null => {
  if (!raw) return null
  const tokens = (Array.isArray(raw) ? raw : [raw])
    .filter((t): t is string => typeof t === 'string')
    .flatMap((s) => s.split(/\s+/))
    .filter(Boolean)
  if (tokens.includes('write')) return 'write'
  if (tokens.includes('write_once')) return 'write_once'
  if (tokens.includes('read')) return 'read'
  return typeof raw === 'string' ? raw : null
}

// ─── Redirect URL builders ────────────────────────────────────────────────────

/**
 * Build a redirect URL appending the given params either as a fragment (#)
 * or query string (?), depending on responseMode.
 */
export const buildRedirectUrl = (
  redirectUri: string,
  params: Record<string, string>,
  state: string | null,
  responseMode: string | null
): string => {
  const decoded = decodeURIComponent(redirectUri)
  const statePart = state != null ? `state=${encodeURIComponent(state)}&` : ''
  const paramPart = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  if (responseMode === 'query') {
    const separator = decoded.includes('?') ? '&' : '?'
    return `${decoded}${separator}${statePart}${paramPart}`
  }
  return `${decoded}#${statePart}${paramPart}`
}

export const buildErrorUrl = (
  redirectUri: string,
  state: string | null,
  responseMode: string | null
): string => {
  const decoded = decodeURIComponent(redirectUri)
  const statePart = state != null ? `state=${encodeURIComponent(state)}&` : ''
  if (responseMode === 'query') {
    const separator = decoded.includes('?') ? '&' : '?'
    return `${decoded}${separator}${statePart}error=access_denied`
  }
  return `${decoded}#${statePart}error=access_denied`
}

// ─── JWT / auth code helpers ──────────────────────────────────────────────────

/** base64url encode a string (UTF-8 bytes → base64url, no padding) */
const toBase64Url = (str: string): string => {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return btoa(bytes.map((b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Build a signed JWT for the user, used for both implicit and PKCE flows. */
export const buildUserJwt = async (
  account: UserMetadata,
  userEmail: string | null,
  apiKey: string | null
): Promise<string> => {
  const sdk = await audiusSdk()
  const userId = OptionalId.parse(account.user_id)
  const timestamp = Math.round(Date.now() / 1000)
  const payload = {
    userId,
    email: userEmail,
    name: account.name,
    handle: account.handle,
    verified: account.is_verified,
    profilePicture: account.profile_picture,
    ...(apiKey ? { apiKey } : {}),
    sub: userId,
    iat: timestamp
  }
  const header = toBase64Url(JSON.stringify({ typ: 'JWT', alg: 'keccak256' }))
  const payloadEncoded = toBase64Url(JSON.stringify(payload))
  const message = `${header}.${payloadEncoded}`
  const signature = await sdk.services.audiusWalletClient.signMessage({
    message
  })
  return `${header}.${payloadEncoded}.${toBase64Url(signature)}`
}

/** Exchange user JWT + PKCE params for an authorization code. */
export const exchangeForAuthCode = async ({
  jwt,
  apiKey,
  redirectUri,
  codeChallenge,
  codeChallengeMethod,
  scope
}: {
  jwt: string
  apiKey: string | null
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  scope: string
}): Promise<string | null> => {
  try {
    const res = await fetch(`${env.API_URL}/v1/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: jwt,
        client_id: apiKey,
        redirect_uri: decodeURIComponent(redirectUri),
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        scope
      })
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('OAuth exchange failed:', res.status, body)
      return null
    }
    const { code } = await res.json()
    return code as string
  } catch {
    return null
  }
}
