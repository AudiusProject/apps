import { developmentConfig, productionConfig, sdk } from '@audius/sdk'

const env = import.meta.env.VITE_ENVIRONMENT

const sdkConfig = env === 'development' ? developmentConfig : productionConfig
const apiEndpoint = sdkConfig.network.apiEndpoint

const audiusSdk = sdk({
  appName: 'Audius Protocol Dashboard',
  apiKey: '2cc593fc814461263d282a84286fd4f72c79562e',
  environment: env
})

export { audiusSdk, apiEndpoint }
