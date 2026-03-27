import type {
  FetchParams,
  Middleware,
  RequestContext
} from '../api/generated/default'
import type { SolWallet } from '../solWallet'

/**
 * Injects X-Solana-* headers when a wallet credential is set.
 * Skips if an Authorization header is already present (OAuth takes precedence).
 *
 * @example
 * ```ts
 * import { createSolWalletSignatureMessage } from '@audius/sdk'
 * import bs58 from 'bs58'
 *
 * const sdk = getSDK()
 * const { publicKey } = await phantom.connect()
 * const { message, messageBytes } = createSolWalletSignatureMessage()
 * const { signature: sigBytes } = await phantom.signMessage(messageBytes, 'utf8')
 * const signature = bs58.encode(sigBytes)
 *
 * sdk.solWallet.setCredential({ publicKey: publicKey.toString(), message, signature })
 * // All subsequent SDK calls now include wallet auth headers automatically.
 * ```
 */
export const addSolWalletSignatureMiddleware = ({
  solWallet
}: {
  solWallet: SolWallet
}): Middleware => ({
  pre: async (context: RequestContext): Promise<FetchParams> => {
    const credential = solWallet.getCredential()
    if (!credential) return context

    const headers = context.init.headers as Record<string, string>
    if (headers['Authorization']) return context

    return {
      ...context,
      init: {
        ...context.init,
        headers: {
          ...headers,
          'X-Solana-Wallet': credential.publicKey,
          'X-Solana-Message': credential.message,
          'X-Solana-Signature': credential.signature
        }
      }
    }
  }
})
