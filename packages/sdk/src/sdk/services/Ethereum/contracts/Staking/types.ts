import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type StakingConfig = StakingConfigInternal & {
  ethPublicClient: PublicClient<Transport, typeof mainnet>
}

export type StakingConfigInternal = { address: Hex }
