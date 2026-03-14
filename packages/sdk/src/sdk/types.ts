import { z } from 'zod'
import type { PublicClient, WalletClient } from 'viem'

import type { OAuthTokenStore } from './oauth/tokenStore'
import { AntiAbuseOracleService } from './services/AntiAbuseOracle/types'
import type { AntiAbuseOracleSelectorService } from './services/AntiAbuseOracleSelector/types'
import type { ArchiverService } from './services/Archiver'
import type { AudiusWalletClient } from './services/AudiusWalletClient'
import { EmailEncryptionService } from './services/Encryption'
import type { EntityManagerService } from './services/EntityManager'
import type { EthereumService } from './services/Ethereum'
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
  entityManager?: EntityManagerService

  /**
   * Service used to store and retrieve content e.g. tracks and images
   */
  storage: StorageService

  /**
   * For interacting with the user or app's wallet for signatures or secrets.
   */
  audiusWalletClient: AudiusWalletClient

  /**
   * Service used to log and set a desired log level
   */
  logger: LoggerService

  /**
   * Service used to store OAuth access and refresh tokens.
   * Defaults to `TokenStoreLocalStorage` which persists to localStorage.
   * Override to use in-memory, cookie-based, or other storage strategies.
   */
  tokenStore: OAuthTokenStore

  /**
   * Called with the OAuth URL when `login()` is invoked. Defaults to
   * `window.open` (popup) or `window.location.href` (fullScreen) on web.
   * Required on mobile — use `Linking.openURL` or a WebView.
   */
  openUrl?: (url: string) => void | Promise<void>

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

  /**
   * Service for interacting with Audius Ethereum contracts.
   * Exposes viem contract instances for all protocol contracts,
   * with optional per-environment address overrides.
   */
  ethereum: EthereumService

  /**
   * viem PublicClient for Ethereum reads.
   */
  ethPublicClient: PublicClient

  /**
   * viem WalletClient for Ethereum writes.
   */
  ethWalletClient: WalletClient
}
/**
 * SDK configuration schema that requires api key only (for read-only access with higher rate limits)
 */
const ConfigWithApiKeySchema = z.object({
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
   * Target environment
   * @internal
   */
  environment: z.enum(['development', 'production']).optional()
})

/**
 * SDK configuration schema that requires API secret (read, write using Entity Manager)
 */
const ConfigWithApiSecretSchema = z.object({
  /**
   * Your app name
   */
  appName: z.optional(z.string()),
  /**
   * Services injection
   */
  services: z.optional(z.custom<Partial<ServicesContainer>>()),
  /**
   * API key
   */
  apiKey: z.string().min(1).optional(),
  /**
   * API secret, required for writes that use Entity Manager
   */
  apiSecret: z.string().min(1),
  /**
   * Target environment
   * @internal
   */
  environment: z.enum(['development', 'production']).optional()
})

/**
 * SDK configuration schema that requires bearer token (read, write using API)
 */
const ConfigWithBearerTokenSchema = z.object({
  /**
   * Your app name
   */
  appName: z.optional(z.string()),
  /**
   * Services injection
   */
  services: z.optional(z.custom<Partial<ServicesContainer>>()),
  /**
   * API key
   */
  apiKey: z.string().min(1),
  /**
   * API bearer token, required for writes that use the API
   */
  bearerToken: z.string().min(1),
  /**
   * Target environment
   * @internal
   */
  environment: z.enum(['development', 'production']).optional()
})

/**
 * SDK configuration schema that requires app name only (for read-only access)
 */
const ConfigWithAppNameSchema = z.object({
  /**
   * Your app name
   */
  appName: z.string().min(1),
  /**
   * Services injection
   */
  services: z.optional(z.custom<Partial<ServicesContainer>>()),
  /**
   * Target environment
   * @internal
   */
  environment: z.enum(['development', 'production']).optional()
})

export const SdkConfigSchema = z.union([
  ConfigWithApiKeySchema,
  ConfigWithBearerTokenSchema,
  ConfigWithAppNameSchema,
  ConfigWithApiSecretSchema
])

/**
 * Config for SDK initialization. Requires at least an app name or API key for read-only access, and API secret or bearer token for write access.
 */
export type SdkConfig = z.infer<typeof SdkConfigSchema>
