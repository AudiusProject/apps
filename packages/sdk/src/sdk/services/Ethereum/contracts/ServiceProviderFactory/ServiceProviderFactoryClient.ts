import { ServiceProviderFactory } from '@audius/eth'
import { range } from 'lodash'

import { EthereumContract } from '../EthereumContract'

import type { ServiceProviderFactoryConfig } from './types'

export class ServiceProviderFactoryClient extends EthereumContract {
  discoveryNodeServiceType: `0x${string}`
  contentNodeServiceType: `0x${string}`
  validatorServiceType: `0x${string}`
  contract: ServiceProviderFactory

  constructor(config: ServiceProviderFactoryConfig) {
    super(config)

    this.discoveryNodeServiceType = config.discoveryNodeServiceType
    this.contentNodeServiceType = config.contentNodeServiceType
    this.validatorServiceType = config.validatorServiceType

    this.contract = new ServiceProviderFactory(this.client, {
      address: config.addresses.serviceProviderFactoryAddress
    })
  }

  getDiscoveryNodes = async () => {
    const count = await this.contract.getTotalServiceTypeProviders({
      serviceType: this.discoveryNodeServiceType
    })

    const list = await Promise.all(
      range(1, Number(count) + 1).map(
        async (i) =>
          await this.contract.getServiceEndpointInfo({
            serviceType: this.discoveryNodeServiceType,
            index: BigInt(i)
          })
      )
    )
    // Remove empty endpoints
    return list.filter(([_, endpoint]) => endpoint !== '')
  }

  getContentNodes = async () => {
    const count = await this.contract.getTotalServiceTypeProviders({
      serviceType: this.contentNodeServiceType
    })

    const list = await Promise.all(
      range(1, Number(count) + 1).map(
        async (i) =>
          await this.contract.getServiceEndpointInfo({
            serviceType: this.contentNodeServiceType,
            index: BigInt(i)
          })
      )
    )
    // Remove empty endpoints
    return list.filter(([_, endpoint]) => endpoint !== '')
  }

  getValidators = async () => {
    const count = await this.contract.getTotalServiceTypeProviders({
      serviceType: this.validatorServiceType
    })

    const list = await Promise.all(
      range(1, Number(count) + 1).map(
        async (i) =>
          await this.contract.getServiceEndpointInfo({
            serviceType: this.validatorServiceType,
            index: BigInt(i)
          })
      )
    )
    // Remove empty endpoints
    return list.filter(([_, endpoint]) => endpoint !== '')
  }
}
