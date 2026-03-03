import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type EthRewardsManagerConfig = EthRewardsManagerConfigInternal & {
  ethPublicClient: PublicClient<Transport, typeof mainnet>
}

export type EthRewardsManagerConfigInternal = { address: Hex }
