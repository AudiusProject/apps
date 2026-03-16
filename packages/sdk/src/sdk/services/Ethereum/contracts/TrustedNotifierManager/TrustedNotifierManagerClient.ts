import type { Hex, PublicClient } from 'viem'

import type { TrustedNotifierManagerConfig } from './types'

export class TrustedNotifierManagerClient {
  public readonly contractAddress: Hex

  public readonly publicClient: PublicClient

  constructor(config: TrustedNotifierManagerConfig) {
    this.contractAddress = config.address
    this.publicClient = config.ethPublicClient
  }
}
