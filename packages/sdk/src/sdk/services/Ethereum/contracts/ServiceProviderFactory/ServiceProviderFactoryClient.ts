import { ServiceProviderFactory } from '@audius/eth'
import { range } from 'lodash'
import type { Hex, PublicClient } from 'viem'

import type { ServiceProviderFactoryConfig } from './types'

export class ServiceProviderFactoryClient {
  public readonly contractAddress: Hex

  discoveryNodeServiceType: `0x${string}`
  contentNodeServiceType: `0x${string}`
  validatorServiceType: `0x${string}`

  private readonly publicClient: PublicClient

  constructor(config: ServiceProviderFactoryConfig) {
    this.contractAddress = config.address
    this.publicClient = config.ethPublicClient

    this.discoveryNodeServiceType = config.discoveryNodeServiceType
    this.contentNodeServiceType = config.contentNodeServiceType
    this.validatorServiceType = config.validatorServiceType
  }

  getDiscoveryNodes = async () => {
    const count = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ServiceProviderFactory.abi,
      functionName: 'getTotalServiceTypeProviders',
      args: [this.discoveryNodeServiceType]
    })

    const list = await Promise.all(
      range(1, Number(count) + 1).map(async (i) =>
        this.publicClient.readContract({
          address: this.contractAddress,
          abi: ServiceProviderFactory.abi,
          functionName: 'getServiceEndpointInfo',
          args: [this.discoveryNodeServiceType, BigInt(i)]
        })
      )
    )
    // Remove empty endpoints
    return list.filter(([_, endpoint]) => endpoint !== '')
  }

  getContentNodes = async () => {
    const count = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ServiceProviderFactory.abi,
      functionName: 'getTotalServiceTypeProviders',
      args: [this.contentNodeServiceType]
    })

    const list = await Promise.all(
      range(1, Number(count) + 1).map(async (i) =>
        this.publicClient.readContract({
          address: this.contractAddress,
          abi: ServiceProviderFactory.abi,
          functionName: 'getServiceEndpointInfo',
          args: [this.contentNodeServiceType, BigInt(i)]
        })
      )
    )
    // Remove empty endpoints
    return list.filter(([_, endpoint]) => endpoint !== '')
  }

  getValidators = async () => {
    const count = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ServiceProviderFactory.abi,
      functionName: 'getTotalServiceTypeProviders',
      args: [this.validatorServiceType]
    })

    const list = await Promise.all(
      range(1, Number(count) + 1).map(async (i) =>
        this.publicClient.readContract({
          address: this.contractAddress,
          abi: ServiceProviderFactory.abi,
          functionName: 'getServiceEndpointInfo',
          args: [this.validatorServiceType, BigInt(i)]
        })
      )
    )
    // Remove empty endpoints
    return list.filter(([_, endpoint]) => endpoint !== '')
  }
}
