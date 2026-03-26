/**
 * VITE_AUDIUS_API_KEY is required for OAuth (PKCE flow).
 * Get one at audius.co/settings -> Developer Apps.
 */
const apiKey =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_AUDIUS_API_KEY != null
    ? String(import.meta.env.VITE_AUDIUS_API_KEY).trim()
    : undefined

/**
 * Set VITE_AUDIUS_ENVIRONMENT=development to target a local protocol stack.
 * Omit or set to "production" (default) for the public Audius network.
 */
const environment =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_AUDIUS_ENVIRONMENT === 'development'
    ? ('development' as const)
    : ('production' as const)

/**
 * Default coin ticker to browse on load.
 */
const defaultTicker =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_DEFAULT_TICKER != null
    ? String(import.meta.env.VITE_DEFAULT_TICKER).trim()
    : 'YAK'

export const config = {
  apiKey,
  environment,
  defaultTicker,
  isConfigured: Boolean(apiKey)
}
