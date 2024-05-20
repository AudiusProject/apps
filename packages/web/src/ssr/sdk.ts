import {
  sdk,
  DiscoveryNodeSelector,
  productionConfig,
  stagingConfig,
  developmentConfig
} from '@audius/sdk'
import { env } from 'services/env'

const sdkConfigs = {
  production: productionConfig,
  staging: stagingConfig,
  development: developmentConfig
}

const discoveryNodeSelector = new DiscoveryNodeSelector({
  bootstrapServices: (
    sdkConfigs[process.env.VITE_ENVIRONMENT as keyof typeof sdkConfigs] ??
    productionConfig
  ).network.discoveryNodes
})

export const audiusSdk = sdk({
  appName: env.APP_NAME,
  services: {
    discoveryNodeSelector
  }
})
