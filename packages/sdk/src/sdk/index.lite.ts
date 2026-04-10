/**
 * Lightweight SDK barrel export.
 *
 * This module exports only the lightweight `createSdk` factory, generated API
 * types / models, and minimal utilities. It intentionally excludes heavy
 * services (Solana programs, Ethereum, EntityManager client, etc.) so that
 * external consumers who only need the read API get a much smaller bundle.
 *
 * Internal consumers (web, mobile) that need `createSdkWithServices` and the
 * full services stack should import from `@audius/sdk/full` instead.
 */

/* eslint-disable import/export */
export { createSdk } from './createSdk'
export type { AudiusSdk } from './sdk'
export type { AudiusSdkWithServices } from './createSdkWithServices'

// Generated API clients, models, runtime, and enums
export * from './api/generated/default'

// Non-generated, lightweight API helpers
export { ResolveApi } from './api/ResolveApi'
export { ChallengeId } from './api/challenges/types'
export * from './api/chats/clientTypes'
export * from './api/chats/serverTypes'
export * from './api/comments/types'
export type * from './api/albums/types'
export * from './api/playlists/types'
export { MAX_DESCRIPTION_LENGTH } from './api/tracks/constants'
export type * from './api/tracks/types'
export type * from './api/users/types'
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

// Re-exported generated enum values that also appear in the full barrel
// via api/generated/default — listed here so that the explicit names from
// sdk/index.ts remain resolvable.
export {
  GetAudioTransactionHistorySortMethodEnum,
  GetAudioTransactionHistorySortDirectionEnum,
  GetNotificationsTypesEnum
} from './api/generated/default'

// Middleware (needed by consumers who construct custom Configuration objects)
export * from './middleware'

// Shared types
export * from './types/File'
export * from './types/HashId'
export * from './types/Timeout'

// Lightweight service types and enums used widely across the codebase.
// These pull in NO heavy dependencies (Solana, full viem, hedgehog, etc.).
export type { EntityManagerService } from './services/EntityManager/types'
export { Action as EntityManagerAction, EntityType } from './services/EntityManager/types'
export type { AdvancedOptions } from './services/EntityManager/types'
export { Logger } from './services/Logger'
export type { LoggerService } from './services/Logger'
export { Storage, getDefaultStorageServiceConfig } from './services/Storage'
export type { StorageService, ProgressHandler, FileMetadata, UploadHandle } from './services/Storage'
export {
  StorageNodeSelector,
  getDefaultStorageNodeSelectorConfig
} from './services/StorageNodeSelector'
export type { StorageNodeSelectorService } from './services/StorageNodeSelector'

// SDK config types (ServicesContainer is type-only so no runtime cost)
export { productionConfig } from './config/production'
export { developmentConfig } from './config/development'

// OAuth
export * from './oauth/types'

// SolanaWallet (minimal — NOT the heavy SolanaClient)
export * from './solanaWallet'

// Utilities
export { ParseRequestError } from './utils/parseParams'
export * from './utils/rendezvous'
export * as Errors from './utils/errors'
export * from './utils/hashId'
