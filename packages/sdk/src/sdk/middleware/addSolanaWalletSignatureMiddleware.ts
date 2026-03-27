import type {
  FetchParams,
  Middleware,
  RequestContext
} from '../api/generated/default'
import type { SolanaWallet } from '../solanaWallet'

/**
 * Injects X-Solana-* headers when a wallet credential is set.
 * Skips if an Authorization header is already present (OAuth takes precedence).
 *
 * @example
 * ```ts
 * import { sdk as audiusSdk } from '@audius/sdk'
 *
 * const sdk = audiusSdk({ appName: 'MyApp' })
 * await sdk.solanaWallet.auth(window.solana)
 * sdk.tracks.getTrack({ id: '123' })
 * ```
 */
export const addSolanaWalletSignatureMiddleware = ({
  solanaWallet
}: {
  solanaWallet: SolanaWallet
}): Middleware => ({
  pre: async (context: RequestContext): Promise<FetchParams> => {
    const credential = solanaWallet.getCredential()
    if (!credential) return context

    const headers = context.init.headers as Record<string, string>
    if (headers.Authorization) return context

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
