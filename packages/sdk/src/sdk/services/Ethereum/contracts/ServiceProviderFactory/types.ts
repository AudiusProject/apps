import type { EthereumContractConfigInternal } from '../types'

export type ServiceProviderFactoryConfig = {
  discoveryNodeServiceType: `0x${string}`
  contentNodeServiceType: `0x${string}`
  validatorServiceType: `0x${string}`
} & EthereumContractConfigInternal
