import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type DelegateManagerConfig = DelegateManagerConfigInternal & {
  ethPublicClient: PublicClient<Transport, typeof mainnet>
}

export type DelegateManagerConfigInternal = { address: Hex }
