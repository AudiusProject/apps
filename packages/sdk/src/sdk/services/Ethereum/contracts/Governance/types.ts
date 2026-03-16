import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type GovernanceConfig = GovernanceConfigInternal & {
  ethPublicClient: PublicClient<Transport, typeof mainnet>
}

export type GovernanceConfigInternal = { address: Hex }
