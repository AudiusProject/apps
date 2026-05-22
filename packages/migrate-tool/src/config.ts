const apiKey =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_AUDIUS_API_KEY != null
    ? String(import.meta.env.VITE_AUDIUS_API_KEY).trim()
    : undefined

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
