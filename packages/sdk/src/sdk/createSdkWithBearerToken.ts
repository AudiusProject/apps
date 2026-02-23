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
  WalletApi
} from './api/generated/default'
import { developmentConfig } from './config/development'
import { productionConfig } from './config/production'
import { addBearerTokenMiddleware } from './middleware/addBearerTokenMiddleware'
import { OAuth } from './oauth'
import { Logger } from './services'
import { DevAppSchemaWithBearerToken, type SdkConfig } from './types'

export const createSdkWithBearerToken = (config: SdkConfig) => {
  const parsedConfig = DevAppSchemaWithBearerToken.parse(config)

  const { apiKey, services, bearerToken, environment } = parsedConfig

  const defaultLogger = new Logger({
    logLevel: environment !== 'production' ? 'debug' : undefined
  })
  const logger = services?.logger ?? defaultLogger

  logger.debug('Initializing SDK with bearer token config', {
    apiKey,
    environment
  })

  const apiConfig = new Configuration({
    fetchApi: fetch,
    middleware: [addBearerTokenMiddleware({ bearerToken, logger })],
    basePath:
      config.environment === 'development'
        ? developmentConfig.network.apiEndpoint
        : productionConfig.network.apiEndpoint
  })

  // Initialize OAuth
  const usersApi = new UsersApi(apiConfig)
  const oauth =
    typeof window !== 'undefined'
      ? new OAuth({
          apiKey,
          usersApi
        })
      : undefined

  return {
    oauth,
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
    prizes: new PrizesApi(apiConfig)
  }
}
