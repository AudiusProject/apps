import fetch from 'cross-fetch'

import {
  ChallengesApi,
  CoinsApi,
  CommentsApi,
  Configuration,
  DashboardWalletUsersApi,
  DeveloperAppsApi,
  EventsApi,
  ExploreApi,
  NotificationsApi,
  PlaylistsApi,
  PrizesApi,
  ResolveApi,
  RewardsApi,
  SearchApi,
  TipsApi,
  TracksApi,
  UsersApi,
  WalletApi,
  type Middleware
} from './api/generated/default'
import { UploadsApi } from './api/uploads/UploadsApi'
import { developmentConfig } from './config/development'
import { productionConfig } from './config/production'
import {
  addAppInfoMiddleware,
  addRequestSignatureMiddleware,
  addTokenRefreshMiddleware
} from './middleware'
import { OAuth } from './oauth'
import { OAuthTokenStore } from './oauth/tokenStore'
import { Logger, Storage, StorageNodeSelector } from './services'
import { type SdkConfig } from './types'

export const createSdkWithoutServices = (config: SdkConfig) => {
  const { services, environment } = config

  const appName = 'appName' in config ? config.appName : undefined
  const bearerToken = 'bearerToken' in config ? config.bearerToken : undefined
  const apiKey = 'apiKey' in config ? config.apiKey : undefined
  const apiSecret = 'apiSecret' in config ? config.apiSecret : undefined

  const logger =
    services?.logger ??
    new Logger({
      logLevel: environment !== 'production' ? 'debug' : undefined
    })

  const apiEndpoint =
    config.environment === 'development'
      ? developmentConfig.network.apiEndpoint
      : productionConfig.network.apiEndpoint
  const basePath = `${apiEndpoint}/v1`

  const middleware: Middleware[] = []

  // Token store for PKCE flow — provides dynamic accessToken to Configuration
  const tokenStore = new OAuthTokenStore()

  if (apiSecret || services?.audiusWalletClient) {
    middleware.push(
      addRequestSignatureMiddleware({
        services: {
          audiusWalletClient: services?.audiusWalletClient,
          logger
        },
        apiKey,
        apiSecret
      })
    )
  }

  if (appName || apiKey || services?.audiusWalletClient) {
    middleware.push(
      addAppInfoMiddleware({
        appName,
        apiKey,
        basePath,
        services: {
          audiusWalletClient: services?.audiusWalletClient,
          entityManager: services?.entityManager
        }
      })
    )
  }

  // Auto-refresh middleware — intercepts 401s and retries with a fresh token.
  if (apiKey) {
    middleware.push(
      addTokenRefreshMiddleware({
        tokenStore,
        apiKey,
        basePath
      })
    )
  }

  const apiConfig = new Configuration({
    fetchApi: fetch,
    middleware,
    basePath,
    // Static bearerToken takes precedence; otherwise use the dynamic store
    // so PKCE login can inject tokens after construction.
    accessToken: bearerToken ?? tokenStore.asAccessTokenProvider()
  })

  // Initialize OAuth
  const usersApi = new UsersApi(apiConfig)
  const oauth =
    typeof window !== 'undefined'
      ? new OAuth({
          apiKey,
          tokenStore,
          basePath
        })
      : undefined

  return {
    oauth,
    tokenStore,
    tracks: new TracksApi(apiConfig),
    users: usersApi,
    // albums
    playlists: new PlaylistsApi(apiConfig),
    tips: new TipsApi(apiConfig),
    resolve: new ResolveApi(apiConfig),
    // chats
    // grants
    developerApps: new DeveloperAppsApi(apiConfig),
    dashboardWalletUsers: new DashboardWalletUsersApi(apiConfig),
    rewards: new RewardsApi(apiConfig),
    // services
    comments: new CommentsApi(apiConfig),
    notifications: new NotificationsApi(apiConfig),
    events: new EventsApi(apiConfig),
    explore: new ExploreApi(apiConfig),
    search: new SearchApi(apiConfig),
    coins: new CoinsApi(apiConfig),
    wallets: new WalletApi(apiConfig),
    challenges: new ChallengesApi(apiConfig),
    prizes: new PrizesApi(apiConfig),
    uploads: new UploadsApi({
      storageService:
        services?.storage ??
        new Storage({
          storageNodeSelector:
            services?.storageNodeSelector ??
            new StorageNodeSelector({
              endpoint: apiEndpoint, // health_check is at root, not /v1
              logger
            }),
          logger
        })
    })
  }
}
