import { ServiceTypeManager } from '@audius/eth'
import { hexToString } from 'viem'

import { EthereumContract } from '../EthereumContract'

import type { ServiceTypeManagerConfig } from './types'

export class ServiceTypeManagerClient extends EthereumContract {
  discoveryNodeServiceType: `0x${string}`
  contentNodeServiceType: `0x${string}`
  validatorServiceType: `0x${string}`
  contract: ServiceTypeManager

  constructor(config: ServiceTypeManagerConfig) {
    super(config)

    this.discoveryNodeServiceType = config.discoveryNodeServiceType
    this.contentNodeServiceType = config.contentNodeServiceType
    this.validatorServiceType = config.validatorServiceType

    this.contract = new ServiceTypeManager(this.client, {
      address: config.addresses.serviceTypeManagerAddress
    })
  }

  getDiscoveryNodeVersion = async () => {
    const version = await this.contract.getCurrentVersion({
      serviceType: this.discoveryNodeServiceType
    })
    return hexToString(version, { size: 32 })
  }

  getContentNodeVersion = async () => {
    const version = await this.contract.getCurrentVersion({
      serviceType: this.contentNodeServiceType
    })
    return hexToString(version, { size: 32 })
  }

  getValidatorVersion = async () => {
    const version = await this.contract.getCurrentVersion({
      serviceType: this.validatorServiceType
    })
    return hexToString(version, { size: 32 })
  }
}
