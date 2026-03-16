import { sdk } from '@audius/sdk/services'

const env = import.meta.env.VITE_ENVIRONMENT as 'dev' | 'prod'

const instance = sdk({
  appName: 'ddex',
  environment: env === 'dev' ? 'development' : 'production'
})

export const useSdk = () => ({ sdk: instance })
