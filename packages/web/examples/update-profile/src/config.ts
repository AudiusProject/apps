/**
 * Set in .env: VITE_WRITE_SERVER_URL, optionally VITE_AUDIUS_API_KEY
 * Vite exposes env vars prefixed with VITE_ to the client.
 */
const writeServerUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_WRITE_SERVER_URL != null
    ? String(import.meta.env.VITE_WRITE_SERVER_URL).trim().replace(/\/$/, '')
    : undefined

const apiKey =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUDIUS_API_KEY != null
    ? String(import.meta.env.VITE_AUDIUS_API_KEY).trim()
    : undefined

export const config = {
  writeServerUrl,
  apiKey,
  isConfigured: Boolean(writeServerUrl && apiKey)
}
