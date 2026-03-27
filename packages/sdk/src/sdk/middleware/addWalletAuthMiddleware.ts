import type {
  FetchParams,
  Middleware,
  RequestContext
} from '../api/generated/default'
import type { WalletAuth } from '../walletAuth'

const WALLET_HEADER = 'X-Solana-Wallet'
const MESSAGE_HEADER = 'X-Solana-Message'
const SIGNATURE_HEADER = 'X-Solana-Signature'

/**
 * Injects Solana wallet auth headers into every request when a credential
 * is present. Skips if the request already has an Authorization header
 * (i.e. OAuth takes precedence).
 */
export const addWalletAuthMiddleware = ({
  walletAuth
}: {
  walletAuth: WalletAuth
}): Middleware => ({
  pre: async (context: RequestContext): Promise<FetchParams> => {
    const credential = walletAuth.getCredential()
    if (!credential) return context

    const headers = context.init.headers as Record<string, string>
    if (headers['Authorization']) return context

    return {
      ...context,
      init: {
        ...context.init,
        headers: {
          ...headers,
          [WALLET_HEADER]: credential.publicKey,
          [MESSAGE_HEADER]: credential.message,
          [SIGNATURE_HEADER]: credential.signature
        }
      }
    }
  }
})
