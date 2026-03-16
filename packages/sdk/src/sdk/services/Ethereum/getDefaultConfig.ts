import type { SdkServicesConfig } from '../../config/types'

import type { EthereumServiceConfigInternal } from './types'

export const getDefaultEthereumServiceConfig = (
  config: SdkServicesConfig
): EthereumServiceConfigInternal => ({
  addresses: {
    audiusToken: config.ethereum.addresses.audiusTokenAddress,
    audiusWormhole: config.ethereum.addresses.audiusWormholeAddress,
    staking: config.ethereum.addresses.stakingAddress,
    delegateManager: config.ethereum.addresses.delegateManagerAddress,
    serviceProviderFactory:
      config.ethereum.addresses.serviceProviderFactoryAddress,
    ethRewardsManager: config.ethereum.addresses.ethRewardsManagerAddress,
    serviceTypeManager: config.ethereum.addresses.serviceTypeManagerAddress,
    governance: config.ethereum.addresses.governanceAddress,
    claimsManager: config.ethereum.addresses.claimsManagerAddress,
    trustedNotifierManager:
      config.ethereum.addresses.trustedNotifierManagerAddress
  }
})
