import type { PublicClient, Transport, WalletClient } from 'viem'
import type { mainnet } from 'viem/chains'
import { z } from 'zod'

import { AntiAbuseOracleService } from './services/AntiAbuseOracle/types'
import type { AntiAbuseOracleSelectorService } from './services/AntiAbuseOracleSelector/types'
import type { ArchiverService } from './services/Archiver'
import type { AudiusWalletClient } from './services/AudiusWalletClient'
import { EmailEncryptionService } from './services/Encryption'
import type { EntityManagerService } from './services/EntityManager'
import {
  AudiusTokenClient,
  ClaimsManagerClient,
  DelegateManagerClient,
  EthRewardsManagerClient,
  GovernanceClient,
  RegistryClient,
  ServiceProviderFactoryClient,
  TrustedNotifierManagerClient,
  AudiusWormholeClient
} from './services/Ethereum'
import { ServiceTypeManagerClient } from './services/Ethereum/contracts/ServiceTypeManager'
import { StakingClient } from './services/Ethereum/contracts/Staking/StakingClient'
import type { LoggerService } from './services/Logger'
import type {
  PaymentRouterClient,
  SolanaRelayService,
  SolanaWalletAdapter
} from './services/Solana'
import { ClaimableTokensClient } from './services/Solana/programs/ClaimableTokensClient'
import { RewardManagerClient } from './services/Solana/programs/RewardManagerClient'
import type { SolanaClient } from './services/Solana/programs/SolanaClient'
import type { StorageService } from './services/Storage'
import type { StorageNodeSelectorService } from './services/StorageNodeSelector'
export type ServicesContainer = {
  /**
   * Service used to choose storage node
   */
  storageNodeSelector: StorageNodeSelectorService

  /**
   * Service used to write and update entities on chain
   */
  entityManager: EntityManagerService

  /**
   * Service used to store and retrieve content e.g. tracks and images
   */
  storage: StorageService

  /**
   * For interacting with the user or app's wallet for signatures or secrets.
   */
  audiusWalletClient: AudiusWalletClient

  ethWalletClient: WalletClient<Transport, typeof mainnet>

  ethPublicClient: PublicClient<Transport, typeof mainnet>

  /**
   * Contract client to interact with the Audius token
   */
  audiusTokenClient: AudiusTokenClient

  /**
   * Contract client to interact with claiming rewards
   */
  claimsManagerClient: ClaimsManagerClient

  /**
   * Contract client to interact with staking and delegating stake
   */
  delegateManagerClient: DelegateManagerClient

  /**
   * Contract client to interact with the staking system
   */
  stakingClient: StakingClient

  /**
   * Contract client to interact with the trusted notifier services
   */
  trustedNotifierManagerClient: TrustedNotifierManagerClient

  /**
   * Contract client to interact with wormhole
   */
  audiusWormholeClient: AudiusWormholeClient

  /**
   * Contract client to interact with the eth contract registry
   */
  registryClient: RegistryClient

  /**
   * Contract client to interact with the governance contract
   */
  governanceClient: GovernanceClient

  /**
   * Contract client to interact with service types
   */
  serviceTypeManagerClient: ServiceTypeManagerClient

  /**
   * Contract client to interact with service provider info
   */
  serviceProviderFactoryClient: ServiceProviderFactoryClient

  /**
   * Contract client to interact with the ethereum rewards manager
   */
  ethRewardsManagerClient: EthRewardsManagerClient

  /**
   * Service used to log and set a desired log level
   */
  logger: LoggerService

  /**
   * Service used to interact with the Solana relay
   */
  solanaRelay: SolanaRelayService

  /**
   * Service used to interact with the Solana wallet
   */
  solanaWalletAdapter: SolanaWalletAdapter

  /**
   * Service used to interact with the Solana RPCs
   */
  solanaClient: SolanaClient

  /**
   * Claimable Tokens Program client for Solana
   */
  claimableTokensClient: ClaimableTokensClient

  /**
   * Payment Router Program client for Solana
   */
  paymentRouterClient: PaymentRouterClient

  /**
   * Reward Manager Program client for Solana
   */
  rewardManagerClient: RewardManagerClient

  /**
   * Service used to choose a healthy Anti Abuse Oracle
   */
  antiAbuseOracleSelector: AntiAbuseOracleSelectorService

  /**
   * Service used to interact with Anti Abuse Oracle
   */
  antiAbuseOracle: AntiAbuseOracleService

  /**
   * Service used to handle the encryption and decryption of emails, also used for the encryption needed to share emails between users
   */
  emailEncryptionService: EmailEncryptionService

  /**
   * Service used to create and download track archives
   */
  archiverService?: ArchiverService
}

/**
 * SDK configuration schema that requires API keypairs
 */
const DevAppSchema = z.object({
  /**
   * Your app name
   */
  appName: z.optional(z.string()),
  /**
   * Services injection
   */
  services: z.optional(z.custom<Partial<ServicesContainer>>()),
  /**
   * API key, required for writes
   */
  apiKey: z.string().min(1),
  /**
   * API secret, required for writes
   */
  apiSecret: z.optional(z.string().min(1)),
  /**
   * Target environment
   * @internal
   */
  environment: z.enum(['development', 'staging', 'production']).optional()
})

const CustomAppSchema = z.object({
  /**
   * Your app name
   */
  appName: z.string().min(1),
  /**
   * Services injection
   */
  services: z.optional(z.custom<Partial<ServicesContainer>>()),
  /**
   * API key, required for writes
   */
  apiKey: z.optional(z.string().min(1)),
  /**
   * API secret, required for writes
   */
  apiSecret: z.optional(z.string().min(1)),
  /**
   * Target environment
   * @internal
   */
  environment: z.enum(['development', 'staging', 'production']).optional()
})

export const SdkConfigSchema = z.union([DevAppSchema, CustomAppSchema])

export type SdkConfig = z.infer<typeof SdkConfigSchema>
