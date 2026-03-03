import type { Hex, PublicClient } from 'viem'

import type { GovernanceConfig } from './types'

export class GovernanceClient {
  public readonly contractAddress: Hex

  public readonly publicClient: PublicClient

  constructor(config: GovernanceConfig) {
    this.contractAddress = config.address
    this.publicClient = config.ethPublicClient
  }
}
