/**
 * Set EXPO_PUBLIC_AUDIUS_API_KEY in a .env file.
 * Required for OAuth write scope (PKCE flow) and direct track creation.
 * Get one at audius.co/settings → Developer Apps.
 */
const apiKey =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AUDIUS_API_KEY != null
    ? String(process.env.EXPO_PUBLIC_AUDIUS_API_KEY).trim()
    : undefined

export const config = {
  apiKey,
  isConfigured: Boolean(apiKey)
}
