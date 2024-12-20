import { audiusBackend } from '@audius/common/services'

import { track } from 'services/analytics'
import { discoveryNodeSelectorService } from 'services/audius-sdk/discoveryNodeSelector'
import { getStorageNodeSelector } from 'services/audius-sdk/storageNodeSelector'
import { getFeatureEnabled } from 'services/remote-config/featureFlagHelpers'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import { monitoringCallbacks } from 'services/serviceMonitoring'
import { reportToSentry } from 'store/errors/reportToSentry'
import { isElectron } from 'utils/clientUtil'

import { env } from '../env'

/**
 * audiusBackend initialized for a web environment
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
  getHostUrl: () => window.location.origin,
  discoveryNodeSelectorService,
  getStorageNodeSelector,
  identityServiceUrl: env.IDENTITY_SERVICE,
  generalAdmissionUrl: env.GENERAL_ADMISSION,
  isElectron: isElectron(),
  monitoringCallbacks,
  nativeMobile: false,
  recaptchaSiteKey: env.RECAPTCHA_SITE_KEY,
  recordAnalytics: track,
  reportError: reportToSentry,
  registryAddress: env.REGISTRY_ADDRESS,
  entityManagerAddress: env.ENTITY_MANAGER_ADDRESS,
  remoteConfigInstance,
  setLocalStorageItem: async (key, value) =>
    window.localStorage.setItem(key, value),
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
  },
  userNodeUrl: env.USER_NODE,
  web3NetworkId: env.WEB3_NETWORK_ID,
  web3ProviderUrls: (env.WEB3_PROVIDER_URL || '').split(','),
  waitForWeb3: async () => {
    if (!window.web3Loaded) {
      await new Promise<void>((resolve) => {
        const onLoad = () => {
          window.removeEventListener('WEB3_LOADED', onLoad)
          resolve()
        }
        window.addEventListener('WEB3_LOADED', onLoad)
      })
    }
  }
})
