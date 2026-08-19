import { type Chain } from 'viem'

import { env } from 'services/env'

/**
 * Audius ACDC chain (now ports to Core).
 *
 * Deliberately lives outside `ReownAppKitModal`. That module constructs
 * `WagmiAdapter`, `SolanaAdapter` and `createAppKit` as import-time side
 * effects, so importing *any* symbol from it — even a plain config object like
 * this one — pulls the whole AppKit graph (`@reown/*`, `@walletconnect/*`)
 * into the importing chunk.
 *
 * Most consumers only need `audiusChain.id`. Keeping the definition free of
 * Reown imports lets them stay out of that graph entirely.
 *
 * Typed against viem's `Chain` rather than `@reown/appkit/networks` so there is
 * no `@reown` coupling here at all, even at the type level.
 */
export const audiusChain = {
  id: env.AUDIUS_NETWORK_CHAIN_ID,
  name: 'Audius',
  nativeCurrency: { name: '-', symbol: '-', decimals: 18 },
  rpcUrls: {
    default: { http: [`${env.API_URL}/core/erpc`] }
  }
} as const satisfies Chain
