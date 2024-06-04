import { isBrowser } from 'browser-or-node'
import fetch from 'cross-fetch'

import { ResolveApi } from './api/ResolveApi'
import { AlbumsApi } from './api/albums/AlbumsApi'
import { ChallengesApi } from './api/challenges/ChallengesApi'
import { ChatsApi } from './api/chats/ChatsApi'
import { DashboardWalletUsersApi } from './api/dashboard-wallet-users/DashboardWalletUsersApi'
import { DeveloperAppsApi } from './api/developer-apps/DeveloperAppsApi'
import { Configuration, TipsApi } from './api/generated/default'
import {
  TracksApi as TracksApiFull,
  Configuration as ConfigurationFull,
  PlaylistsApi as PlaylistsApiFull,
  ReactionsApi as ReactionsApiFull,
  SearchApi as SearchApiFull,
  UsersApi as UsersApiFull,
  TipsApi as TipsApiFull,
  TransactionsApi as TransactionsApiFull
} from './api/generated/full'
import { GrantsApi } from './api/grants/GrantsApi'
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
import { AppAuth } from './services/Auth/AppAuth'
import { DefaultAuth } from './services/Auth/DefaultAuth'
import {
  DiscoveryNodeSelector,
  getDefaultDiscoveryNodeSelectorConfig
} from './services/DiscoveryNodeSelector'
import {
  EntityManager,
  getDefaultEntityManagerConfig
} from './services/EntityManager'
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
import { Storage, getDefaultStorageServiceConfig } from './services/Storage'
import {
  StorageNodeSelector,
  getDefaultStorageNodeSelectorConfig
} from './services/StorageNodeSelector'
import { SdkConfig, SdkConfigSchema, ServicesContainer } from './types'

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

  if (config.apiSecret && isBrowser) {
    logger.warn(
      "apiSecret should only be provided server side so that it isn't exposed"
    )
  }

  const auth =
    config.services?.auth ??
    (config.apiKey && config.apiSecret
      ? new AppAuth(config.apiKey, config.apiSecret)
      : new DefaultAuth(config.apiKey))

  const discoveryNodeSelector =
    config.services?.discoveryNodeSelector ??
    new DiscoveryNodeSelector({
      ...getDefaultDiscoveryNodeSelectorConfig(servicesConfig),
      logger
    })

  const storageNodeSelector =
    config.services?.storageNodeSelector ??
    new StorageNodeSelector({
      ...getDefaultStorageNodeSelectorConfig(servicesConfig),
      auth,
      discoveryNodeSelector,
      logger
    })

  const entityManager =
    config.services?.entityManager ??
    new EntityManager({
      ...getDefaultEntityManagerConfig(servicesConfig),
      discoveryNodeSelector,
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

  const solanaRelay =
    config.services?.solanaRelay ??
    new SolanaRelay(
      new Configuration({
        middleware: [
          discoveryNodeSelector.createMiddleware(),
          addRequestSignatureMiddleware({ services: { auth, logger } })
        ]
      })
    )

  const solanaWalletAdapter =
    config.services?.solanaWalletAdapter ??
    new SolanaRelayWalletAdapter({
      solanaRelay
    })

  const claimableTokensClient =
    config.services?.claimableTokensClient ??
    new ClaimableTokensClient({
      ...getDefaultClaimableTokensConfig(servicesConfig),
      solanaWalletAdapter
    })

  const rewardManagerClient =
    config.services?.rewardManagerClient ??
    new RewardManagerClient({
      ...getDefaultRewardManagerClentConfig(servicesConfig),
      solanaWalletAdapter
    })

  const paymentRouterClient =
    config.services?.paymentRouterClient ??
    new PaymentRouterClient({
      ...getDefaultPaymentRouterClientConfig(servicesConfig),
      solanaWalletAdapter
    })

  const services: ServicesContainer = {
    storageNodeSelector,
    discoveryNodeSelector,
    antiAbuseOracleSelector,
    entityManager,
    storage,
    auth,
    claimableTokensClient,
    rewardManagerClient,
    paymentRouterClient,
    solanaWalletAdapter,
    solanaRelay,
    antiAbuseOracle,
    logger
  }
  return services
}

const initializeApis = ({
  apiKey,
  appName,
  services
}: {
  apiKey?: string
  appName?: string
  services: ServicesContainer
}) => {
  const middleware = [
    addAppInfoMiddleware({ apiKey, appName, services }),
    addRequestSignatureMiddleware({ services }),
    services.discoveryNodeSelector.createMiddleware()
  ]
  const generatedApiClientConfig = new Configuration({
    fetchApi: fetch,
    middleware
  })

  const tracks = new TracksApi(
    generatedApiClientConfig,
    services.discoveryNodeSelector,
    services.storage,
    services.entityManager,
    services.auth,
    services.logger,
    services.claimableTokensClient,
    services.paymentRouterClient
  )
  const users = new UsersApi(
    generatedApiClientConfig,
    services.storage,
    services.entityManager,
    services.auth,
    services.logger,
    services.claimableTokensClient
  )
  const albums = new AlbumsApi(
    generatedApiClientConfig,
    services.storage,
    services.entityManager,
    services.auth,
    services.logger,
    services.claimableTokensClient,
    services.paymentRouterClient
  )
  const playlists = new PlaylistsApi(
    generatedApiClientConfig,
    services.storage,
    services.entityManager,
    services.auth,
    services.logger
  )
  const tips = new TipsApi(generatedApiClientConfig)
  const { resolve } = new ResolveApi(generatedApiClientConfig)
  const chats = new ChatsApi(
    new Configuration({
      fetchApi: fetch,
      basePath: '',
      middleware
    }),
    services.auth,
    services.discoveryNodeSelector,
    services.logger
  )
  const grants = new GrantsApi(
    generatedApiClientConfig,
    services.entityManager,
    services.auth,
    users
  )

  const developerApps = new DeveloperAppsApi(
    generatedApiClientConfig,
    services.entityManager,
    services.auth
  )

  const dashboardWalletUsers = new DashboardWalletUsersApi(
    generatedApiClientConfig,
    services.entityManager,
    services.auth
  )

  const challenges = new ChallengesApi(
    generatedApiClientConfig,
    users,
    services.discoveryNodeSelector,
    services.rewardManagerClient,
    services.claimableTokensClient,
    services.antiAbuseOracle,
    services.logger
  )

  const generatedApiClientConfigFull = new ConfigurationFull({
    fetchApi: fetch,
    middleware
  })

  const full = {
    tracks: new TracksApiFull(generatedApiClientConfigFull),
    users: new UsersApiFull(generatedApiClientConfigFull),
    search: new SearchApiFull(generatedApiClientConfigFull),
    playlists: new PlaylistsApiFull(generatedApiClientConfigFull),
    reactions: new ReactionsApiFull(generatedApiClientConfigFull),
    tips: new TipsApiFull(generatedApiClientConfigFull),
    transactions: new TransactionsApiFull(generatedApiClientConfigFull)
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
    challenges,
    services
  }
}

export type AudiusSdk = ReturnType<typeof sdk>
