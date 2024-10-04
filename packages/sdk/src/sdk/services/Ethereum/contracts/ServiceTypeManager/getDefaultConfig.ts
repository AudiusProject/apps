import { SdkServicesConfig } from '../../../../config/types'
import { getDefaultEthereumClientConfig } from '../getDefaultConfig'

import type { ServiceTypeManagerConfig } from './types'

export const getDefaultServiceTypeManagerConfig = (config: {
  ethereum: SdkServicesConfig['ethereum']
}): ServiceTypeManagerConfig => ({
  discoveryNodeServiceType:
    '0x646973636f766572792d6e6f6465000000000000000000000000000000000000',
  contentNodeServiceType:
    '0x636f6e74656e742d6e6f64650000000000000000000000000000000000000000',
  ...getDefaultEthereumClientConfig(config)
})
