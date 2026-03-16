import { SdkServicesConfig } from '../../../../config/types'

import type { RegistryConfigInternal } from './types'

export const getDefaultRegistryConfig = (config: {
  ethereum: SdkServicesConfig['ethereum']
}): RegistryConfigInternal => ({
  address: config.ethereum.addresses.registryAddress
})
