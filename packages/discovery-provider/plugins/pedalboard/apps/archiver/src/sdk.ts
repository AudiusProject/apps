import { createSdkWithServices, type AudiusSdkWithServices } from '@audius/sdk'
import { readConfig, Environment } from './config'

const environmentToSdkEnvironment: Record<
  Environment,
  'development' | 'production'
> = {
  dev: 'development',
  prod: 'production'
}

let audiusSdk: AudiusSdkWithServices | undefined = undefined

export const getAudiusSdk = () => {
  if (audiusSdk === undefined) {
    const config = readConfig()
    audiusSdk = createSdkWithServices({
      appName: 'audius-client',
      environment: environmentToSdkEnvironment[config.environment]
    })
  }
  return audiusSdk
}
