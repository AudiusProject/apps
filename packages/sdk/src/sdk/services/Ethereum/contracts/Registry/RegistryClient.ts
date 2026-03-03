import type { Hex, PublicClient } from 'viem'

import type { RegistryConfig } from './types'

export class RegistryClient {
  public readonly contractAddress: Hex

  public readonly publicClient: PublicClient

  constructor(config: RegistryConfig) {
    this.contractAddress = config.address
    this.publicClient = config.ethPublicClient
  }
}
