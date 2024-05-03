import { SdkServicesConfig } from '../../config'
import { Logger } from '../Logger'

import type { EntityManagerConfigInternal } from './types'

export const getDefaultEntityManagerConfig = (
  config: SdkServicesConfig
): EntityManagerConfigInternal => ({
  contractAddress: config.acdc.entityManagerContractAddress,
  web3ProviderUrl: config.acdc.web3ProviderUrl,
  identityServiceUrl: config.network.identityService,
  useDiscoveryRelay: true,
  logger: new Logger()
})
