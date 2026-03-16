import { EthRewardsManager } from '@audius/eth'
import type { Hex, PublicClient } from 'viem'

import type { EthRewardsManagerConfig } from './types'

export class EthRewardsManagerClient {
  public readonly contractAddress: Hex

  private readonly publicClient: PublicClient

  constructor(config: EthRewardsManagerConfig) {
    this.contractAddress = config.address
    this.publicClient = config.ethPublicClient
  }

  getAntiAbuseOracleAddresses = () =>
    this.publicClient.readContract({
      address: this.contractAddress,
      abi: EthRewardsManager.abi,
      functionName: 'getAntiAbuseOracleAddresses'
    })
}
