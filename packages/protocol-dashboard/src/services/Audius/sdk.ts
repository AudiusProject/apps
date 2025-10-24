import {
  developmentConfig,
  productionConfig,
  stagingConfig,
  sdk
} from '@audius/sdk'

const env = import.meta.env.VITE_ENVIRONMENT

const sdkConfig =
  env === 'development'
    ? developmentConfig
    : env === 'staging'
      ? stagingConfig
      : productionConfig
const apiEndpoint = sdkConfig.network.apiEndpoint

const audiusSdk = sdk({
  appName: 'Audius Protocol Dashboard',
  environment: env
})

export { audiusSdk, apiEndpoint }
