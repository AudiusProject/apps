import type { Hex, PublicClient, WalletClient } from 'viem'

import type { AudiusWalletClient } from '../AudiusWalletClient'

export type EthereumServiceConfigInternal = {
  addresses: {
    audiusToken: Hex
    audiusWormhole: Hex
    staking: Hex
    delegateManager: Hex
    governance: Hex
    serviceProviderFactory: Hex
    claimsManager: Hex
    ethRewardsManager: Hex
    serviceTypeManager: Hex
    trustedNotifierManager: Hex
    registry: Hex
  }
}

export type EthereumServiceConfig = {
  /** viem PublicClient to use for Ethereum reads. */
  publicClient: PublicClient
  /** viem WalletClient to use for Ethereum writes. */
  walletClient: WalletClient
  /** Wallet client for typed-data signing. */
  audiusWalletClient: AudiusWalletClient
  addresses?: Partial<EthereumServiceConfigInternal['addresses']>
}
