/**
 * Set EXPO_PUBLIC_AUDIUS_API_KEY in a .env file.
 * Required for OAuth (PKCE) with write scope. Register redirect URI: likerepost://oauth/callback
 */
const apiKey =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AUDIUS_API_KEY != null
    ? String(process.env.EXPO_PUBLIC_AUDIUS_API_KEY).trim()
    : undefined

export const config = {
  apiKey,
  isConfigured: Boolean(apiKey)
}
