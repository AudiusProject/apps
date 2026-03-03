import { SdkServicesConfig } from '../../../../config/types'

import type { ClaimsManagerConfigInternal } from './types'

export const getDefaultClaimsManagerConfig = (config: {
  ethereum: SdkServicesConfig['ethereum']
}): ClaimsManagerConfigInternal => ({
  address: config.ethereum.addresses.claimsManagerAddress
})
