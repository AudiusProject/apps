import { AudiusSdk, sdk, Configuration, SolanaRelay } from '@audius/sdk'
import { AudiusLibs } from '@audius/sdk/dist/libs'

import { waitForLibsInit } from 'services/audius-backend/eagerLoadUtils'
import { discoveryNodeSelectorService } from 'services/audius-sdk/discoveryNodeSelector'
import { env } from 'services/env'

import { auth } from './auth'

declare global {
  interface Window {
    audiusLibs: AudiusLibs
    audiusSdk: AudiusSdk
  }
}

let inProgress = false
const SDK_LOADED_EVENT_NAME = 'AUDIUS_SDK_LOADED'

const initSdk = async () => {
  inProgress = true
  // We wait for libs here because AudiusBackend needs to register a listener that
  // will let AudiusAPIClient know that libs has loaded, and without it AudiusAPIClient
  // retries failed requests ad nauseum with no delays or backoffs and won't ever get
  // the signal that libs is loaded. It sucks. But the easiest thing to do right now...
  // console.debug('[audiusSdk] Waiting for libs init...')
  // await waitForLibsInit()
  // console.debug('[audiusSdk] Libs initted, initializing SDK...')

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

  // Overrides some DN configuration from optimizely
  const discoveryNodeSelector = await discoveryNodeSelectorService.getInstance()

  const audiusSdk = sdk({
    appName: env.APP_NAME,
    apiKey: env.API_KEY,
    environment: env.ENVIRONMENT,
    services: {
      discoveryNodeSelector,
      solanaRelay,
      auth
    }
  })
  console.debug('[audiusSdk] SDK initted.')
  window.audiusSdk = audiusSdk
  inProgress = false
  window.dispatchEvent(new CustomEvent(SDK_LOADED_EVENT_NAME))
  return audiusSdk
}

export const audiusSdk = async () => {
  if (inProgress) {
    await new Promise((resolve) => {
      window.addEventListener(SDK_LOADED_EVENT_NAME, resolve)
    })
  } else if (!window.audiusSdk) {
    return await initSdk()
  }
  return window.audiusSdk
}
