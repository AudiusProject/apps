import { AudiusSdk, sdk } from '@audius/sdk'
import { readConfig, Environment } from './config'

const environmentToSdkEnvironment: Record<
  Environment,
  'development' | 'staging' | 'production'
> = {
  dev: 'development',
  stage: 'staging',
  prod: 'production'
}

let audiusSdk: AudiusSdk | undefined = undefined

export const getAudiusSdk = () => {
  if (audiusSdk === undefined) {
    const config = readConfig()
    audiusSdk = sdk({
      appName: 'anti-abuse-oracle',
      environment: environmentToSdkEnvironment[config.environment]
    })
  }
  return audiusSdk
}
