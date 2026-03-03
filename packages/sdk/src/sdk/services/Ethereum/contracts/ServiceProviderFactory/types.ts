import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type ServiceProviderFactoryConfig =
  ServiceProviderFactoryConfigInternal & {
    ethPublicClient: PublicClient<Transport, typeof mainnet>
  }

export type ServiceProviderFactoryConfigInternal = {
  address: Hex
  discoveryNodeServiceType: `0x${string}`
  contentNodeServiceType: `0x${string}`
  validatorServiceType: `0x${string}`
}
