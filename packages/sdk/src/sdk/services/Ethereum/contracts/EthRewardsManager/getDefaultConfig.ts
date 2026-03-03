import { SdkServicesConfig } from '../../../../config/types'

import type { EthRewardsManagerConfigInternal } from './types'

export const getDefaultEthRewardsManagerConfig = (config: {
  ethereum: SdkServicesConfig['ethereum']
}): EthRewardsManagerConfigInternal => ({
  address: config.ethereum.addresses.ethRewardsManagerAddress
})
