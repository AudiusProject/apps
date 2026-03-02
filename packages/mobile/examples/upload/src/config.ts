/**
 * Set in .env: EXPO_PUBLIC_WRITE_SERVER_URL, optionally EXPO_PUBLIC_AUDIUS_API_KEY
 */
const writeServerUrl =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WRITE_SERVER_URL != null
    ? String(process.env.EXPO_PUBLIC_WRITE_SERVER_URL).trim().replace(/\/$/, '')
    : undefined

const apiKey =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AUDIUS_API_KEY != null
    ? String(process.env.EXPO_PUBLIC_AUDIUS_API_KEY).trim()
    : undefined

export const config = {
  writeServerUrl,
  apiKey,
  isConfigured: Boolean(writeServerUrl && apiKey)
}
