import type { Hex } from 'viem'

import type { StorageNode } from '../services'

export type SdkServicesConfig = {
  network: {
    minVersion: string
    apiEndpoint: string
    storageNodes: StorageNode[]
    antiAbuseOracleNodes: {
      registeredAddresses: string[]
      endpoints: string[]
    }
    identityService: string
  }
  acdc: {
    entityManagerContractAddress: string
    chainId: number
  }
  solana: {
    claimableTokensProgramAddress: string
    rewardManagerProgramAddress: string
    rewardManagerStateAddress: string
    paymentRouterProgramAddress: string
    stakingBridgeProgramAddress: string
    rpcEndpoint: string
    usdcTokenMint: string
    wAudioTokenMint: string
    bonkTokenMint: string
    rewardManagerLookupTableAddress: string
  }
  ethereum: {
    rpcEndpoint: string
    addresses: {
      serviceTypeManagerAddress: Hex
      serviceProviderFactoryAddress: Hex
      ethRewardsManagerAddress: Hex
      audiusTokenAddress: Hex
      audiusWormholeAddress: Hex
      delegateManagerAddress: Hex
      stakingAddress: Hex
    }
  }
}
