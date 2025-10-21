import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'

import { ResolveApi } from './api/ResolveApi'
import { AlbumsApi } from './api/albums/AlbumsApi'
import { ChatsApi } from './api/chats/ChatsApi'
import { CommentsApi } from './api/comments/CommentsAPI'
import { DashboardWalletUsersApi } from './api/dashboard-wallet-users/DashboardWalletUsersApi'
import { DeveloperAppsApi } from './api/developer-apps/DeveloperAppsApi'
import { EventsApi } from './api/events/EventsApi'
import {
  ChallengesApi,
  CoinsApi,
  Configuration,
  ExploreApi,
  RewardsApi,
  TipsApi,
  WalletApi
} from './api/generated/default'
import {
  TracksApi as TracksApiFull,
  Configuration as ConfigurationFull,
  PlaylistsApi as PlaylistsApiFull,
  ReactionsApi as ReactionsApiFull,
  SearchApi as SearchApiFull,
  UsersApi as UsersApiFull,
  TipsApi as TipsApiFull,
  TransactionsApi as TransactionsApiFull,
  NotificationsApi as NotificationsApiFull,
  CidDataApi as CidDataApiFull,
  CommentsApi as CommentsApiFull,
  ExploreApi as ExploreApiFull
} from './api/generated/full'
import { GrantsApi } from './api/grants/GrantsApi'
import { NotificationsApi } from './api/notifications/NotificationsApi'
import { PlaylistsApi } from './api/playlists/PlaylistsApi'
import { TracksApi } from './api/tracks/TracksApi'
import { UsersApi } from './api/users/UsersApi'
import { developmentConfig } from './config/development'
import { productionConfig } from './config/production'
import { stagingConfig } from './config/staging'
import {
  addAppInfoMiddleware,
  addRequestSignatureMiddleware
} from './middleware'
import { OAuth } from './oauth'
import {
  PaymentRouterClient,
  getDefaultPaymentRouterClientConfig
} from './services'
import { AntiAbuseOracle } from './services/AntiAbuseOracle/AntiAbuseOracle'
import { getDefaultAntiAbuseOracleSelectorConfig } from './services/AntiAbuseOracleSelector'
import { AntiAbuseOracleSelector } from './services/AntiAbuseOracleSelector/AntiAbuseOracleSelector'
import { createAppWalletClient } from './services/AudiusWalletClient'
import { EmailEncryptionService } from './services/Encryption'
import {
  EntityManagerClient,
  getDefaultEntityManagerConfig
} from './services/EntityManager'
import {
  EthRewardsManagerClient,
  getDefaultEthRewardsManagerConfig,
  getDefaultServiceProviderFactoryConfig,
  getDefaultServiceTypeManagerConfig,
  ServiceProviderFactoryClient,
  ServiceTypeManagerClient,
  AudiusTokenClient,
  getDefaultAudiusTokenConfig,
  ClaimsManagerClient,
  getDefaultClaimsManagerConfig,
  DelegateManagerClient,
  getDefaultDelegateManagerConfig,
  StakingClient,
  getDefaultStakingConfig,
  TrustedNotifierManagerClient,
  getDefaultTrustedNotifierManagerConfig,
  AudiusWormholeClient,
  getDefaultWormholeConfig,
  RegistryClient,
  getDefaultRegistryConfig,
  GovernanceClient,
  getDefaultGovernanceConfig
} from './services/Ethereum'
import { Logger } from './services/Logger'
import { SolanaRelay } from './services/Solana/SolanaRelay'
import { SolanaRelayWalletAdapter } from './services/Solana/SolanaRelayWalletAdapter'
import {
  getDefaultClaimableTokensConfig,
  ClaimableTokensClient
} from './services/Solana/programs/ClaimableTokensClient'
import {
  RewardManagerClient,
  getDefaultRewardManagerClentConfig
} from './services/Solana/programs/RewardManagerClient'
import { SolanaClient } from './services/Solana/programs/SolanaClient'
import { getDefaultSolanaClientConfig } from './services/Solana/programs/getDefaultConfig'
import { Storage, getDefaultStorageServiceConfig } from './services/Storage'
import {
  StorageNodeSelector,
  getDefaultStorageNodeSelectorConfig
} from './services/StorageNodeSelector'
import { SdkConfig, SdkConfigSchema, ServicesContainer } from './types'
import fetch from './utils/fetch'

/**
 * The Audius SDK
 */
export const sdk = (config: SdkConfig) => {
  SdkConfigSchema.parse(config)
  const { appName, apiKey } = config

  // Initialize services
  const services = initializeServices(config)

  // Initialize APIs
  const apis = initializeApis({
    config,
    apiKey,
    appName,
    services
  })

  // Initialize OAuth
  const oauth =
    typeof window !== 'undefined'
      ? new OAuth({
          appName,
          apiKey,
          usersApi: apis.users,
          logger: services.logger
        })
      : undefined

  return {
    oauth,
    ...apis
  }
}

const initializeServices = (config: SdkConfig) => {
  const servicesConfig =
    config.environment === 'development'
      ? developmentConfig
      : config.environment === 'staging'
        ? stagingConfig
        : productionConfig

  const defaultLogger = new Logger({
    logLevel: config.environment !== 'production' ? 'debug' : undefined
  })
  const logger = config.services?.logger ?? defaultLogger

  const isBrowser: boolean =
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
  if (config.apiSecret && isBrowser) {
    logger.warn(
      "apiSecret should only be provided server side so that it isn't exposed"
    )
  }
  const audiusWalletClient =
    config.services?.audiusWalletClient ??
    createAppWalletClient({
      // Allow undefined apiKey for now, use dummy wallet
      apiKey: config.apiKey ?? '0x0000000000000000000000000000000000000000',
      apiSecret: config.apiSecret
    })

  const ethPublicClient =
    config.services?.ethPublicClient ??
    createPublicClient({
      chain: mainnet,
      transport: http(servicesConfig.ethereum.rpcEndpoint)
    })

  const ethWalletClient =
    config.services?.ethWalletClient ??
    createWalletClient({
      chain: mainnet,
      transport: http(servicesConfig.ethereum.rpcEndpoint)
    })

  const storageNodeSelector =
    config.services?.storageNodeSelector ??
    new StorageNodeSelector({
      ...getDefaultStorageNodeSelectorConfig(servicesConfig),
      logger
    })

  const entityManager =
    config.services?.entityManager ??
    new EntityManagerClient({
      ...getDefaultEntityManagerConfig(servicesConfig),
      audiusWalletClient,
      logger
    })

  const storage =
    config.services?.storage ??
    new Storage({
      ...getDefaultStorageServiceConfig(servicesConfig),
      storageNodeSelector,
      logger
    })

  const antiAbuseOracleSelector =
    config.services?.antiAbuseOracleSelector ??
    new AntiAbuseOracleSelector({
      ...getDefaultAntiAbuseOracleSelectorConfig(servicesConfig),
      logger
    })

  const antiAbuseOracle =
    config.services?.antiAbuseOracle ??
    new AntiAbuseOracle({
      antiAbuseOracleSelector
    })

  const middleware = [
    addRequestSignatureMiddleware({
      services: { audiusWalletClient, logger },
      apiKey: config.apiKey,
      apiSecret: config.apiSecret
    })
  ]

  /* Solana Programs */
  const solanaRelay = config.services?.solanaRelay
    ? config.services.solanaRelay.withMiddleware(
        addRequestSignatureMiddleware({
          services: { audiusWalletClient, logger },
          apiKey: config.apiKey,
          apiSecret: config.apiSecret
        })
      )
    : new SolanaRelay(
        new Configuration({
          middleware
        })
      )

  const archiverService = config.services?.archiverService
    ? config.services.archiverService.withMiddleware(
        addRequestSignatureMiddleware({
          services: { audiusWalletClient, logger },
          apiKey: config.apiKey,
          apiSecret: config.apiSecret
        })
      )
    : undefined

  const emailEncryptionService =
    config.services?.emailEncryptionService ??
    new EmailEncryptionService(
      new Configuration({
        fetchApi: fetch,
        basePath: '',
        middleware
      }),
      audiusWalletClient
    )

  const solanaWalletAdapter =
    config.services?.solanaWalletAdapter ??
    new SolanaRelayWalletAdapter({
      solanaRelay
    })

  const solanaClient =
    config.services?.solanaClient ??
    new SolanaClient({
      ...getDefaultSolanaClientConfig(servicesConfig),
      solanaWalletAdapter,
      logger
    })

  const claimableTokensClient =
    config.services?.claimableTokensClient ??
    new ClaimableTokensClient({
      ...getDefaultClaimableTokensConfig(servicesConfig),
      solanaClient,
      audiusWalletClient,
      logger
    })

  const rewardManagerClient =
    config.services?.rewardManagerClient ??
    new RewardManagerClient({
      ...getDefaultRewardManagerClentConfig(servicesConfig),
      solanaClient,
      logger
    })

  const paymentRouterClient =
    config.services?.paymentRouterClient ??
    new PaymentRouterClient({
      ...getDefaultPaymentRouterClientConfig(servicesConfig),
      solanaClient
    })

  /* Ethereum Contracts */
  const audiusTokenClient =
    config.services?.audiusTokenClient ??
    new AudiusTokenClient({
      audiusWalletClient,
      ethPublicClient,
      ethWalletClient,
      ...getDefaultAudiusTokenConfig(servicesConfig)
    })

  const claimsManagerClient =
    config.services?.claimsManagerClient ??
    new ClaimsManagerClient({
      ...getDefaultClaimsManagerConfig(servicesConfig)
    })

  const delegateManagerClient =
    config.services?.delegateManagerClient ??
    new DelegateManagerClient({
      audiusWalletClient,
      ethPublicClient,
      ethWalletClient,
      ...getDefaultDelegateManagerConfig(servicesConfig)
    })

  const stakingClient =
    config.services?.stakingClient ??
    new StakingClient({
      audiusWalletClient,
      ethPublicClient,
      ethWalletClient,
      ...getDefaultStakingConfig(servicesConfig)
    })

  const trustedNotifierManagerClient =
    config.services?.trustedNotifierManagerClient ??
    new TrustedNotifierManagerClient({
      ...getDefaultTrustedNotifierManagerConfig(servicesConfig)
    })

  const audiusWormholeClient =
    config.services?.audiusWormholeClient ??
    new AudiusWormholeClient({
      audiusWalletClient,
      ethPublicClient,
      ethWalletClient,
      ...getDefaultWormholeConfig(servicesConfig)
    })

  const registryClient =
    config.services?.registryClient ??
    new RegistryClient({
      ...getDefaultRegistryConfig(servicesConfig)
    })

  const governanceClient =
    config.services?.governanceClient ??
    new GovernanceClient({
      ...getDefaultGovernanceConfig(servicesConfig)
    })

  const serviceTypeManagerClient =
    config.services?.serviceTypeManagerClient ??
    new ServiceTypeManagerClient({
      ...getDefaultServiceTypeManagerConfig(servicesConfig)
    })

  const serviceProviderFactoryClient =
    config.services?.serviceProviderFactoryClient ??
    new ServiceProviderFactoryClient({
      ...getDefaultServiceProviderFactoryConfig(servicesConfig)
    })

  const ethRewardsManagerClient =
    config.services?.ethRewardsManagerClient ??
    new EthRewardsManagerClient({
      ...getDefaultEthRewardsManagerConfig(servicesConfig)
    })

  const services: ServicesContainer = {
    storageNodeSelector,
    antiAbuseOracleSelector,
    entityManager,
    storage,
    audiusWalletClient,
    ethPublicClient,
    ethWalletClient,
    claimableTokensClient,
    rewardManagerClient,
    paymentRouterClient,
    solanaClient,
    solanaWalletAdapter,
    solanaRelay,
    antiAbuseOracle,
    audiusTokenClient,
    claimsManagerClient,
    delegateManagerClient,
    stakingClient,
    trustedNotifierManagerClient,
    audiusWormholeClient,
    registryClient,
    governanceClient,
    serviceTypeManagerClient,
    serviceProviderFactoryClient,
    ethRewardsManagerClient,
    emailEncryptionService,
    archiverService,
    logger
  }
  return services
}

const initializeApis = ({
  config,
  apiKey,
  appName,
  services
}: {
  config: SdkConfig
  apiKey?: string
  appName?: string
  services: ServicesContainer
}) => {
  const apiEndpoint =
    config.environment === 'development'
      ? developmentConfig.network.apiEndpoint
      : config.environment === 'staging'
        ? stagingConfig.network.apiEndpoint
        : productionConfig.network.apiEndpoint
  const basePath = `${apiEndpoint}/v1`

  const middleware = [
    addAppInfoMiddleware({
      apiKey,
      appName,
      services,
      basePath
    }),
    addRequestSignatureMiddleware({
      services,
      apiKey,
      apiSecret: config.apiSecret
    })
  ]
  const apiClientConfig = new Configuration({
    fetchApi: fetch,
    middleware,
    basePath
  })

  const tracks = new TracksApi(
    apiClientConfig,
    services.storage,
    services.entityManager,
    services.logger,
    services.claimableTokensClient,
    services.paymentRouterClient,
    services.solanaRelay,
    services.solanaClient
  )
  const users = new UsersApi(
    apiClientConfig,
    services.storage,
    services.entityManager,
    services.logger,
    services.claimableTokensClient,
    services.solanaClient,
    services.emailEncryptionService
  )
  const albums = new AlbumsApi(
    apiClientConfig,
    services.storage,
    services.entityManager,
    services.logger,
    services.claimableTokensClient,
    services.paymentRouterClient,
    services.solanaRelay,
    services.solanaClient
  )
  const playlists = new PlaylistsApi(
    apiClientConfig,
    services.storage,
    services.entityManager,
    services.logger
  )
  const comments = new CommentsApi(
    apiClientConfig,
    services.entityManager,
    services.logger
  )
  const challenges = new ChallengesApi(apiClientConfig)
  const coins = new CoinsApi(apiClientConfig)
  const wallets = new WalletApi(apiClientConfig)
  const tips = new TipsApi(apiClientConfig)
  const resolveApi = new ResolveApi(apiClientConfig)
  const rewards = new RewardsApi(apiClientConfig)
  const resolve = resolveApi.resolve.bind(resolveApi)

  const chats = new ChatsApi(
    new Configuration({
      basePath: apiEndpoint, // comms is not a v1 API
      fetchApi: fetch,
      middleware
    }),
    services.audiusWalletClient,
    services.logger
  )

  const grants = new GrantsApi(apiClientConfig, services.entityManager, users)

  const developerApps = new DeveloperAppsApi(
    apiClientConfig,
    services.entityManager
  )

  const dashboardWalletUsers = new DashboardWalletUsersApi(
    apiClientConfig,
    services.entityManager
  )

  const notifications = new NotificationsApi(
    apiClientConfig,
    services.entityManager
  )

  const generatedApiClientConfigFull = new ConfigurationFull({
    basePath: `${basePath}/full`,
    fetchApi: fetch,
    middleware
  })

  const events = new EventsApi(
    apiClientConfig,
    services.entityManager,
    services.logger
  )
  const explore = new ExploreApi(apiClientConfig)

  const full = {
    tracks: new TracksApiFull(generatedApiClientConfigFull),
    users: new UsersApiFull(generatedApiClientConfigFull),
    search: new SearchApiFull(generatedApiClientConfigFull),
    playlists: new PlaylistsApiFull(generatedApiClientConfigFull),
    reactions: new ReactionsApiFull(generatedApiClientConfigFull),
    tips: new TipsApiFull(generatedApiClientConfigFull),
    transactions: new TransactionsApiFull(generatedApiClientConfigFull),
    notifications: new NotificationsApiFull(generatedApiClientConfigFull),
    cidData: new CidDataApiFull(generatedApiClientConfigFull),
    comments: new CommentsApiFull(generatedApiClientConfigFull),
    explore: new ExploreApiFull(generatedApiClientConfigFull)
  }

  return {
    tracks,
    users,
    albums,
    playlists,
    tips,
    resolve,
    full,
    chats,
    grants,
    developerApps,
    dashboardWalletUsers,
    rewards,
    services,
    comments,
    notifications,
    events,
    explore,
    coins,
    wallets,
    challenges
  }
}

export type AudiusSdk = ReturnType<typeof sdk>
