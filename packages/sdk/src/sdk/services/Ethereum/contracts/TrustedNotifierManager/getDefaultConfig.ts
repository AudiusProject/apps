import { SdkServicesConfig } from '../../../../config/types'

import type { TrustedNotifierManagerConfigInternal } from './types'

export const getDefaultTrustedNotifierManagerConfig = (config: {
  ethereum: SdkServicesConfig['ethereum']
}): TrustedNotifierManagerConfigInternal => ({
  address: config.ethereum.addresses.trustedNotifierManagerAddress
})
