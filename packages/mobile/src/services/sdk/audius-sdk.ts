import { EventEmitter } from 'events'

import {
  createSdkWithServices,
  type AudiusSdkWithServices,
  SolanaRelay,
  ArchiverService,
  Configuration
} from '@audius/sdk/services'

import { env } from 'app/services/env'

import { getAudiusWalletClient } from './auth'

let inProgress = false
const SDK_LOADED_EVENT_NAME = 'AUDIUS_SDK_LOADED'
const sdkEventEmitter = new EventEmitter()
let sdkInstance: AudiusSdkWithServices

const initSdk = async () => {
  inProgress = true

  // For now, the only solana relay we want to use is on DN 1, so hardcode
  // the selection there.
  const solanaRelay = new SolanaRelay(
    new Configuration({
      basePath: '/solana',
      headers: {
        'Content-Type': 'application/json'
      },
      middleware: [
        {
          pre: async (context) => {
            const endpoint = env.SOLANA_RELAY_ENDPOINT
            const url = `${endpoint}${context.url}`
            return { url, init: context.init }
          }
        }
      ]
    })
  )

  const archiverService = new ArchiverService(
    new Configuration({
      basePath: '/archive',
      middleware: [
        {
          pre: async (context) => {
            const endpoint = env.ARCHIVE_ENDPOINT
            const url = `${endpoint}${context.url}`
            return { url, init: context.init }
          }
        }
      ]
    })
  )

  // Overrides some DN configuration from optimizely
  const audiusWalletClient = await getAudiusWalletClient()

  const audiusSdk = createSdkWithServices({
    appName: env.APP_NAME,
    apiKey: env.API_KEY,
    environment: env.ENVIRONMENT,
    services: {
      solanaRelay,
      audiusWalletClient,
      archiverService
    }
  })
  sdkInstance = audiusSdk
  inProgress = false
  sdkEventEmitter.emit(SDK_LOADED_EVENT_NAME)
  return audiusSdk
}

export const audiusSdk = async () => {
  if (inProgress) {
    await new Promise((resolve) => {
      sdkEventEmitter.addListener(SDK_LOADED_EVENT_NAME, resolve)
    })
    return sdkInstance
  } else if (!sdkInstance) {
    return await initSdk()
  }
  return sdkInstance
}
