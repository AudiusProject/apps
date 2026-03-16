import {
  createSdkWithServices,
  AudiusWalletClient,
  ClaimableTokensClient,
  PaymentRouterClient,
  RewardManagerClient,
  StorageNodeSelectorService
} from '@audius/sdk/services'

export const audiusSdk = () => {
  return createSdkWithServices({
    appName: 'test',
    environment: 'development',
    services: {
      claimableTokensClient: (() => {}) as unknown as ClaimableTokensClient,
      rewardManagerClient: (() => {}) as unknown as RewardManagerClient,
      paymentRouterClient: (() => {}) as unknown as PaymentRouterClient,
      storageNodeSelector: (() => {}) as unknown as StorageNodeSelectorService,
      audiusWalletClient: {
        signMessage: () => {},
        getAddresses: async () => ['0x0000000000000000000000000000000000000000']
      } as unknown as AudiusWalletClient
    }
  })
}
