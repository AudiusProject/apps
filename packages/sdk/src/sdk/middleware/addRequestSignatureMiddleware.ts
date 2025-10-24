import { Mutex } from 'async-mutex'

import {
  type Middleware,
  type RequestContext,
  type FetchParams
} from '../api/generated/default'
import {
  HedgehogWalletNotFoundError,
  createAppWalletClient,
  type AudiusWalletClient
} from '../services/AudiusWalletClient'
import { ServicesContainer } from '../types'

const SIGNATURE_EXPIRY_MS =
  24 /* hr */ * 60 /* min */ * 60 /* sec */ * 1000 /* ms */ // 1 day
const MESSAGE_HEADER = 'Encoded-Data-Message'
const SIGNATURE_HEADER = 'Encoded-Data-Signature'

/**
 * Appends request authentication headers to a request.
 * Request headers are computed only every SIGNATURE_EXPIRY_MS or when the value returned by `auth.getAddress()` changes.
 * @param options the middleware options
 */
export const addRequestSignatureMiddleware = ({
  services,
  apiKey,
  apiSecret
}: {
  services: Pick<ServicesContainer, 'audiusWalletClient' | 'logger'>
  apiKey?: string
  apiSecret?: string
}): Middleware => {
  const mutex = new Mutex()
  let message: string | null = null
  let signatureAddress: string | null = null
  let signature: string | null = null
  let timestamp: number | null = null
  let appWalletClient: AudiusWalletClient | null = null

  const getSignature = async () => {
    // Run this exclusively to prevent multiple requests from updating the signature at the same time
    // and reverting to an older signature
    return mutex.runExclusive(async () => {
      const { audiusWalletClient, logger } = services
      try {
        // Prefer signing with audiusWalletClient if provided
        if (apiSecret && !audiusWalletClient) {
          appWalletClient = createAppWalletClient({
            apiKey: apiKey ?? '0x0000000000000000000000000000000000000000',
            apiSecret
          })
        }

        const signingClient = audiusWalletClient ?? appWalletClient
        const [currentAddress] = await signingClient.getAddresses()
        const currentTimestamp = new Date().getTime()
        const isExpired =
          !timestamp || timestamp + SIGNATURE_EXPIRY_MS < currentTimestamp

        const needsUpdate =
          !message ||
          !signature ||
          isExpired ||
          signatureAddress !== currentAddress

        if (needsUpdate) {
          if (!currentAddress) {
            throw new Error('Could not get a wallet address.')
          }
          signatureAddress = currentAddress

          const m = `signature:${currentTimestamp}`

          signature = await signingClient.signMessage({
            message: m
          })

          // Cache the new signature and message
          message = m
          timestamp = currentTimestamp
        }
      } catch (e) {
        // Don't log a warning for HedgehogWalletNotFoundError as it's expected when user is logged out
        if (!(e instanceof HedgehogWalletNotFoundError)) {
          logger.warn(`Unable to add request signature: ${e}`)
        }
      }
      return { message, signature }
    })
  }

  return {
    pre: async (context: RequestContext): Promise<FetchParams> => {
      // If request already has a signature, skip adding it
      const existingHeaders = context.init.headers as Record<string, string>
      if (
        existingHeaders[MESSAGE_HEADER] &&
        existingHeaders[SIGNATURE_HEADER]
      ) {
        return context
      }

      const { message, signature } = await getSignature()

      // Return the updated request with the signature in the headers
      return !!message && !!signature
        ? {
            ...context,
            url: context.url,
            init: {
              ...context.init,
              headers: {
                ...context.init.headers,
                [MESSAGE_HEADER]: message,
                [SIGNATURE_HEADER]: signature
              }
            }
          }
        : context
    }
  }
}
