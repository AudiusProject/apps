import { developmentConfig, productionConfig, sdk } from '@audius/sdk'

const env = import.meta.env.VITE_ENVIRONMENT
const apiKey = import.meta.env.VITE_AUDIUS_API_KEY as string | undefined

const sdkConfig = env === 'development' ? developmentConfig : productionConfig
const apiEndpoint = sdkConfig.network.apiEndpoint

// redirectUri for OAuth PKCE - popup redirects here, handleRedirect posts code to opener
const redirectUri =
  typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '') || '/'}`
    : undefined

const audiusSdk = sdk({
  appName: 'Audius Protocol Dashboard',
  apiKey,
  environment: env,
  redirectUri
})

export { audiusSdk, apiEndpoint }
