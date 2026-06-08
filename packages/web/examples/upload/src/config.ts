/**
 * VITE_AUDIUS_API_KEY is required for OAuth write scope (PKCE flow).
 * Get one at audius.co/settings → Developer Apps.
 */
const apiKey =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_AUDIUS_API_KEY != null
    ? String(import.meta.env.VITE_AUDIUS_API_KEY).trim()
    : undefined

/**
 * Set VITE_AUDIUS_ENVIRONMENT=development to target a local protocol stack
 * started via `audius-compose up` + `audius-compose connect`.
 * Omit or set to "production" (default) for the public Audius network.
 */
const environment =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_AUDIUS_ENVIRONMENT === 'development'
    ? ('development' as const)
    : ('production' as const)

export const config = {
  apiKey,
  environment,
  isConfigured: Boolean(apiKey)
}
