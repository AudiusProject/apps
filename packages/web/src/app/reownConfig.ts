import { env } from 'services/env'
import zIndex from 'utils/zIndex'

// Audius ACDC chain (now ports to Core)
// This is defined here to avoid importing Chain type from @reown
export const audiusChain = {
  id: env.AUDIUS_NETWORK_CHAIN_ID,
  name: 'Audius',
  nativeCurrency: { name: '-', symbol: '-', decimals: 18 },
  rpcUrls: {
    default: { http: [`${env.API_URL}/core/erpc`] }
  }
} as const

let wagmiAdapterInstance: any | null = null
let appkitModalInstance: any | null = null
let configPromise: Promise<any> | null = null

/**
 * Lazy initialization function for Reown AppKit.
 * Uses dynamic imports to ensure @reown packages are only loaded when this function is called.
 */
export const getReownConfig = async () => {
  if (wagmiAdapterInstance && appkitModalInstance) {
    return {
      wagmiAdapter: wagmiAdapterInstance,
      appkitModal: appkitModalInstance,
      audiusChain
    }
  }

  // If already initializing, wait for that promise
  if (configPromise) {
    return configPromise
  }

  // Use dynamic imports to lazy-load @reown packages
  console.log('[Reown] Lazy loading @reown packages...')
  configPromise = Promise.all([
    import('@reown/appkit/networks'),
    import('@reown/appkit/react'),
    import('@reown/appkit-adapter-solana/react'),
    import('@reown/appkit-adapter-wagmi')
  ]).then(
    ([
      { mainnet, solana },
      { createAppKit },
      { SolanaAdapter },
      { WagmiAdapter }
    ]) => {
      const projectId = env.REOWN_PROJECT_ID
      const networks = [mainnet, solana, audiusChain]

      wagmiAdapterInstance = new WagmiAdapter({
        networks,
        projectId
      })

      const solanaAdapter = new SolanaAdapter()

      appkitModalInstance = createAppKit({
        adapters: [wagmiAdapterInstance, solanaAdapter],
        networks,
        projectId,
        themeVariables: {
          '--w3m-z-index': zIndex.REOWN_APPKIT_MODAL // above ConnectWalletModal
        },
        features: {
          send: false,
          swaps: false,
          onramp: false,
          socials: false,
          email: false
        }
      })

      console.log('[Reown] @reown packages loaded successfully')
      return {
        wagmiAdapter: wagmiAdapterInstance,
        appkitModal: appkitModalInstance,
        audiusChain
      }
    }
  )

  return configPromise
}

