import fetch from 'cross-fetch'

import { ResolveApi } from './api/ResolveApi'
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
import { TokenStoreLocalStorage } from './oauth/TokenStoreLocalStorage'
import { Logger, Storage, StorageNodeSelector } from './services'
import { SdkConfigSchema, type SdkConfig } from './types'

export const createSdk = (config: SdkConfig) => {
  SdkConfigSchema.parse(config)
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
  const tokenStore = services?.tokenStore ?? new TokenStoreLocalStorage()

  // Initialize OAuth early so it can be passed to middleware
  const redirectUri = 'redirectUri' in config ? config.redirectUri : undefined

  const oauth = new OAuth({
    apiKey,
    tokenStore,
    basePath,
    logger,
    redirectUri,
    openUrl: services?.openUrl
  })

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
  if (apiKey && oauth) {
    middleware.push(
      addTokenRefreshMiddleware({
        oauth
      })
    )
  }

  const apiConfig = new Configuration({
    fetchApi: fetch,
    middleware,
    basePath,
    accessToken: (name, _scopes) => {
      // 'OAuth2' comes from the name in the securitySchemes in the OpenAPI spec
      if (name === 'OAuth2') {
        // For OAuth2, we need to return the token with the 'Bearer ' prefix ourselves
        // See: https://github.com/OpenAPITools/openapi-generator/issues/12514#issuecomment-1166293860
        return tokenStore
          .getAccessToken()
          .then((t) => (t ? `Bearer ${t}` : undefined))
      }
      // 'BearerAuth' comes from the name in the securitySchemes in the OpenAPI spec
      else if (name === 'BearerAuth') {
        // The template adds the 'Bearer ' prefix, so we don't need to add it here
        return bearerToken
      }
      // Default to bearerToken for any other auth schemes that require a token, for backward compatibility with older SDK versions
      return bearerToken
    }
  })

  // Initialize API clients
  const usersApi = new UsersApi(apiConfig)
  const resolveApi = new ResolveApi(apiConfig)

  return {
    oauth,
    tokenStore,
    tracks: new TracksApi(apiConfig),
    users: usersApi,
    // albums
    playlists: new PlaylistsApi(apiConfig),
    tips: new TipsApi(apiConfig),
    resolve: resolveApi.resolve.bind(resolveApi),
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
      storage:
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
