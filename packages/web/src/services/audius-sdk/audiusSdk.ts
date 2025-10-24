import {
  AudiusSdk,
  sdk,
  Configuration,
  SolanaRelay,
  ArchiverService
} from '@audius/sdk'
import { createWalletClient, custom, RpcRequestError } from 'viem'
import { mainnet } from 'viem/chains'
import { getHttpRpcClient } from 'viem/utils'

import { env } from 'services/env'

import { getAudiusWalletClient } from './auth'

declare global {
  interface Window {
    audiusSdk: AudiusSdk
  }
}

let inProgress = false
const SDK_LOADED_EVENT_NAME = 'AUDIUS_SDK_LOADED'

export const initSdk = async () => {
  inProgress = true

  // For now, the only solana relay we want to use is on DN 1, so hardcode
  // the selection there.
  const solanaRelay = new SolanaRelay(
    new Configuration({
      basePath: '/solana',
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

  // Set up a relay to identity for Ethereum RPC requests so that identity can
  // pay for gas fees on approved transactions.
  const audiusWalletClient = await getAudiusWalletClient()
  const ethWalletClient = createWalletClient({
    account: '0x0000000000000000000000000000000000000000', // dummy replaced by relay DO NOT REMOVE
    chain: mainnet,
    transport: custom({
      request: async (request) => {
        const url = `${env.IDENTITY_SERVICE}/ethereum/rpc`
        const message = `signature:${new Date().getTime()}`
        const signature = await audiusWalletClient.signMessage({ message })
        const rpcClient = getHttpRpcClient(url, {
          fetchOptions: {
            headers: {
              'Encoded-Data-Message': message,
              'Encoded-Data-Signature': signature
            }
          }
        })
        const res = await rpcClient.request({ body: request })
        if ('result' in res) {
          return res.result
        }
        throw new RpcRequestError({
          body: request,
          error:
            'error' in res ? res.error : { code: 0, message: 'Unknown error' },
          url
        })
      }
    })
  })
  const audiusSdk = sdk({
    appName: env.APP_NAME,
    apiKey: env.API_KEY,
    environment: env.ENVIRONMENT,
    services: {
      solanaRelay,
      audiusWalletClient,
      ethWalletClient,
      archiverService
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
