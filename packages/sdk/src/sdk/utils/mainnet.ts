import { defineChain } from 'viem'

/**
 * Ethereum mainnet, copied from viem's `viem/chains` definition.
 *
 * Importing from `viem/chains` pulls in viem's whole chain list (~230 KB) in
 * bundlers that don't tree-shake CommonJS, like Metro. viem has no export for
 * a single chain, so it's defined here instead.
 */
export const mainnet = /* #__PURE__ */ defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://cloudflare-eth.com']
    }
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api'
    }
  },
  contracts: {
    ensRegistry: {
      address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
    },
    ensUniversalResolver: {
      address: '0xce01f8eee7E479C928F8919abD53E553a36CeF67',
      blockCreated: 19_258_213
    },
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 14_353_601
    }
  }
})
