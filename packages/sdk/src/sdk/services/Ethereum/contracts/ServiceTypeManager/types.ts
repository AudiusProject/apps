import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type ServiceTypeManagerConfig = ServiceTypeManagerConfigInternal & {
  ethPublicClient: PublicClient<Transport, typeof mainnet>
}

export type ServiceTypeManagerConfigInternal = {
  address: Hex
  discoveryNodeServiceType: `0x${string}`
  contentNodeServiceType: `0x${string}`
  validatorServiceType: `0x${string}`
}
