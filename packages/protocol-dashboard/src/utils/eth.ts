import { defaultConfig } from '@web3modal/ethers/react'
import sample from 'lodash/sample'

const ETH_PROVIDER_URLS: string =
  import.meta.env.VITE_ETH_PROVIDER_URL || 'ws://0.0.0.0:8546'

export const ETH_PROVIDER_URL = sample(ETH_PROVIDER_URLS.split(','))

export const CHAIN_ID: string = import.meta.env.VITE_ETH_NETWORK_ID

const chainIdNumber = Number(CHAIN_ID)

export const CHAIN_INFO = {
  chainId: chainIdNumber,
  name:
    chainIdNumber === 1
      ? 'Ethereum Mainnet'
      : chainIdNumber === 11155111
        ? 'Ethereum Sepolia Testnet'
        : 'Unknown',
  currency:
    chainIdNumber === 1
      ? 'ETH'
      : chainIdNumber === 11155111
        ? 'Sepolia ETH'
        : 'Unknown',
  explorerUrl:
    chainIdNumber === 11155111
      ? 'https://sepolia.etherscan.io/'
      : 'https://etherscan.io',
  rpcUrl: ETH_PROVIDER_URL
}

export const WEB3_MODAL_METADATA = {
  name: 'Audius',
  description: 'The Audius Protocol Dashboard',
  url: 'https://dashboard.audius.org',
  icons: [
    'https://www.dropbox.com/scl/fi/xw6rhvvgqev01owt3b5fm/AudiusProtocolDashboardLogo.png?rlkey=41vn0k2w611khbajfedjkphbq&raw=1'
  ]
}

export const ETHERS_CONFIG = defaultConfig({
  metadata: WEB3_MODAL_METADATA,

  enableEIP6963: true, // true by default
  enableInjected: true, // true by default
  enableCoinbase: true, // true by default
  rpcUrl: ETH_PROVIDER_URL, // used for the Coinbase SDK
  defaultChainId: chainIdNumber
})
