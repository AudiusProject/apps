/**
 * Internal entry point for createSdkWithServices and related services.
 *
 * Kept separate from the main SDK bundle so that normal SDK consumers
 * (external developers using sdk() or createSdk()) are not burdened by
 * the additional dependencies required for full services initialization
 * (Ethereum contract clients, viem transports, etc.).
 *
 * Import via: @audius/sdk/services
 */
export {
  createSdkWithServices,
  type AudiusSdkWithServices
} from './createSdkWithServices'
export { TracksApi } from './api/tracks/TracksApi'
export { PlaylistsApi } from './api/playlists/PlaylistsApi'
export { AlbumsApi } from './api/albums/AlbumsApi'
export { CommentsApi } from './api/comments/CommentsAPI'
export { EventsApi } from './api/events/EventsApi'
export { GrantsApi } from './api/grants/GrantsApi'
export { DeveloperAppsApi } from './api/developer-apps/DeveloperAppsApi'
export { DashboardWalletUsersApi } from './api/dashboard-wallet-users/DashboardWalletUsersApi'
export { UsersApi } from './api/users/UsersApi'
export { ResolveApi } from './api/ResolveApi'
export { ChallengeId } from './api/challenges/types'
export * from './api/chats/clientTypes'
export * from './api/chats/serverTypes'
export * from './api/comments/types'
export * from './api/albums/types'
export * from './api/playlists/types'
export { MAX_DESCRIPTION_LENGTH } from './api/tracks/constants'
export * from './api/tracks/types'
export * from './api/users/types'
export * from './api/developer-apps/types'
export * from './api/dashboard-wallet-users/types'
export type {
  AddManagerRequest,
  ApproveGrantRequest,
  CreateGrantRequest,
  EntityManagerAddManagerRequest,
  EntityManagerApproveGrantRequest,
  EntityManagerCreateGrantRequest,
  EntityManagerRemoveManagerRequest,
  EntityManagerRevokeGrantRequest,
  RemoveManagerRequest,
  RevokeGrantRequest
} from './api/grants/types'
export {
  AddManagerSchema,
  ApproveGrantSchema,
  CreateGrantSchema,
  RemoveManagerSchema,
  RevokeGrantSchema
} from './api/grants/types'
export * from './services'
export { productionConfig } from './config/production'
export { developmentConfig } from './config/development'
export * from './index'
