import { audiusBackend } from '@audius/common/services'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { track } from 'app/services/analytics'
import { env } from 'app/services/env'
import { reportToSentry } from 'app/utils/reportToSentry'

import { getFeatureEnabled } from './remote-config'
import { remoteConfigInstance } from './remote-config/remote-config-instance'

/**
 * audiusBackend initialized for a mobile environment
 */
export const audiusBackendInstance = audiusBackend({
  claimDistributionContractAddress:
    env.CLAIM_DISTRIBUTION_CONTRACT_ADDRESS ?? undefined,
  env,
  ethOwnerWallet: env.ETH_OWNER_WALLET ?? undefined,
  ethProviderUrls: (env.ETH_PROVIDER_URL || '').split(','),
  ethRegistryAddress: env.ETH_REGISTRY_ADDRESS,
  ethTokenAddress: env.ETH_TOKEN_ADDRESS,
  getFeatureEnabled,
  getHostUrl: () => {
    return `${env.PUBLIC_PROTOCOL}//${env.PUBLIC_HOSTNAME}`
  },
  identityServiceUrl: env.IDENTITY_SERVICE,
  generalAdmissionUrl: env.GENERAL_ADMISSION,
  isElectron: false,
  localStorage: AsyncStorage,
  nativeMobile: true,
  recaptchaSiteKey: env.RECAPTCHA_SITE_KEY,
  recordAnalytics: track,
  reportError: reportToSentry,
  registryAddress: env.REGISTRY_ADDRESS,
  entityManagerAddress: env.ENTITY_MANAGER_ADDRESS,
  remoteConfigInstance,
  setLocalStorageItem: async (key, value) => AsyncStorage.setItem(key, value),
  solanaConfig: {
    claimableTokenPda: env.CLAIMABLE_TOKEN_PDA,
    claimableTokenProgramAddress: env.CLAIMABLE_TOKEN_PROGRAM_ADDRESS,
    rewardsManagerProgramId: env.REWARDS_MANAGER_PROGRAM_ID,
    rewardsManagerProgramPda: env.REWARDS_MANAGER_PROGRAM_PDA,
    rewardsManagerTokenPda: env.REWARDS_MANAGER_TOKEN_PDA,
    paymentRouterProgramId: env.PAYMENT_ROUTER_PROGRAM_ID,
    solanaClusterEndpoint: env.SOLANA_CLUSTER_ENDPOINT,
    solanaFeePayerAddress: env.SOLANA_FEE_PAYER_ADDRESS,
    solanaTokenAddress: env.SOLANA_TOKEN_PROGRAM_ADDRESS,
    waudioMintAddress: env.WAUDIO_MINT_ADDRESS,
    usdcMintAddress: env.USDC_MINT_ADDRESS,
    wormholeAddress: env.WORMHOLE_ADDRESS ?? undefined
  }
})
