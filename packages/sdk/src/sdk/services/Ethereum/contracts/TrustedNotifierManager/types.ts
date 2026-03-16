import type { Hex, PublicClient, Transport } from 'viem'
import type { mainnet } from 'viem/chains'

export type TrustedNotifierManagerConfig =
  TrustedNotifierManagerConfigInternal & {
    ethPublicClient: PublicClient<Transport, typeof mainnet>
  }

export type TrustedNotifierManagerConfigInternal = { address: Hex }
