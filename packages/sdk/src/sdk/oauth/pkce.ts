/**
 * PKCE (Proof Key for Code Exchange) helpers per RFC 7636.
 */

import { sha256 } from '@noble/hashes/sha256'

/**
 * Base64url-encode a byte array (no padding).
 */
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Generate a random code verifier (43–128 chars, base64url-encoded).
 * Uses 32 random bytes → 43-char base64url string.
 */
export function generateCodeVerifier(): string {
  const arr = new Uint8Array(32)
  globalThis.crypto.getRandomValues(arr)
  return base64url(arr)
}

/**
 * Derive the S256 code challenge from a code verifier.
 * `code_challenge = base64url(SHA-256(code_verifier))`
 */
export function generateCodeChallenge(verifier: string): string {
  const data = new TextEncoder().encode(verifier)
  return base64url(sha256(data))
}

/**
 * Generate a random state parameter for CSRF protection.
 * 16 random bytes → 22-char base64url string.
 */
export function generateState(): string {
  const arr = new Uint8Array(16)
  globalThis.crypto.getRandomValues(arr)
  return base64url(arr)
}
