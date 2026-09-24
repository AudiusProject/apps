import { type Chain } from 'viem'

import { env } from 'services/env'

/**
 * Audius ACDC chain (now ports to Core). Kept free of @reown imports so
 * importing it doesn't pull AppKit into the chunk.
 */
export const audiusChain = {
  id: env.AUDIUS_NETWORK_CHAIN_ID,
  name: 'Audius',
  nativeCurrency: { name: '-', symbol: '-', decimals: 18 },
  rpcUrls: {
    default: { http: [`${env.API_URL}/core/erpc`] }
  }
} as const satisfies Chain
