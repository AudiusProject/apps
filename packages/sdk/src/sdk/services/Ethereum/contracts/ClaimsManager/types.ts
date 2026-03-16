import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type ClaimsManagerConfig = ClaimsManagerConfigInternal & {
  ethPublicClient: PublicClient<Transport, typeof mainnet>
}

export type ClaimsManagerConfigInternal = { address: Hex }
