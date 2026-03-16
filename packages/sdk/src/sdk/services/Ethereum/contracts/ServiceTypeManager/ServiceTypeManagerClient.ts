import { ServiceTypeManager } from '@audius/eth'
import type { Hex, PublicClient } from 'viem'
import { hexToString } from 'viem'

import type { ServiceTypeManagerConfig } from './types'

export class ServiceTypeManagerClient {
  public readonly contractAddress: Hex

  discoveryNodeServiceType: `0x${string}`
  contentNodeServiceType: `0x${string}`
  validatorServiceType: `0x${string}`

  private readonly publicClient: PublicClient

  constructor(config: ServiceTypeManagerConfig) {
    this.contractAddress = config.address
    this.publicClient = config.ethPublicClient

    this.discoveryNodeServiceType = config.discoveryNodeServiceType
    this.contentNodeServiceType = config.contentNodeServiceType
    this.validatorServiceType = config.validatorServiceType
  }

  getDiscoveryNodeVersion = async () => {
    const version = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ServiceTypeManager.abi,
      functionName: 'getCurrentVersion',
      args: [this.discoveryNodeServiceType]
    })
    return hexToString(version, { size: 32 })
  }

  getContentNodeVersion = async () => {
    const version = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ServiceTypeManager.abi,
      functionName: 'getCurrentVersion',
      args: [this.contentNodeServiceType]
    })
    return hexToString(version, { size: 32 })
  }

  getValidatorVersion = async () => {
    const version = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ServiceTypeManager.abi,
      functionName: 'getCurrentVersion',
      args: [this.validatorServiceType]
    })
    return hexToString(version, { size: 32 })
  }
}
