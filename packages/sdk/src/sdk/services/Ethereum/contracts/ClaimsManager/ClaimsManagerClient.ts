import type { Hex, PublicClient } from 'viem'

import type { ClaimsManagerConfig } from './types'

export class ClaimsManagerClient {
  public readonly contractAddress: Hex

  public readonly publicClient: PublicClient

  constructor(config: ClaimsManagerConfig) {
    this.contractAddress = config.address
    this.publicClient = config.ethPublicClient
  }
}
