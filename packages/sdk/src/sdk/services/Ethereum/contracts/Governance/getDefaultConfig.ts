import { SdkServicesConfig } from '../../../../config/types'

import type { GovernanceConfigInternal } from './types'

export const getDefaultGovernanceConfig = (config: {
  ethereum: SdkServicesConfig['ethereum']
}): GovernanceConfigInternal => ({
  address: config.ethereum.addresses.governanceAddress
})
