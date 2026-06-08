/**
 * Set EXPO_PUBLIC_AUDIUS_API_KEY in a .env file.
 * Register redirect URI: audiusauth://oauth/callback
 */
const apiKey =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AUDIUS_API_KEY != null
    ? String(process.env.EXPO_PUBLIC_AUDIUS_API_KEY).trim()
    : undefined

export const REDIRECT_URI = 'audiusauth://oauth/callback'

export const config = {
  apiKey,
  redirectUri: REDIRECT_URI,
  isConfigured: Boolean(apiKey)
}
