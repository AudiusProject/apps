import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type RegistryConfig = RegistryConfigInternal & {
  ethPublicClient: PublicClient<Transport, typeof mainnet>
}

export type RegistryConfigInternal = { address: Hex }
