import {
  mainnet,
  solana,
  type AppKitNetwork
} from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

import { env } from 'services/env'
import zIndex from 'utils/zIndex'

import { registerLoadedAppKit } from './appkit'
import { audiusChain } from './audiusChain'

export { audiusChain }

const projectId = env.REOWN_PROJECT_ID
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  solana,
  audiusChain
]
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId
})
const solanaAdapter = new SolanaAdapter()

export const appkitModal = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
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

registerLoadedAppKit({ appkitModal, wagmiAdapter })
