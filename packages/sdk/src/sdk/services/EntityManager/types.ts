import { Hex } from 'viem'

import type { AudiusWalletClient } from '../AudiusWalletClient'
import type { LoggerService } from '../Logger'

export type EntityManagerTransactionReceipt = {
  blockHash: string
  blockNumber: number
}

export type EntityManagerConfigInternal = {
  /**
   * Address of the EntityManager contract
   */
  contractAddress: string
  /**
   * ACDC chain id
   */
  chainId: number
  /**
   * Logger service, defaults to console
   */
  logger: LoggerService
  /**
   * The endpoint to use for relays
   */
  endpoint: string
}
export type EntityManagerConfig = Partial<EntityManagerConfigInternal> & {
  audiusWalletClient: AudiusWalletClient
}

export type EntityManagerService = {
  manageEntity: (
    options: ManageEntityOptions
  ) => Promise<EntityManagerTransactionReceipt>
  confirmWrite: (options: {
    blockHash: string
    blockNumber: number
    confirmationTimeout?: number
    confirmationPollingInterval?: number
  }) => Promise<boolean>
  decodeManageEntity: (encodedABI: Hex) => {
    userId: bigint
    entityType: EntityType
    entityId: bigint
    action: Action
    metadata: string
    nonce: string
    subjectSig: string
  }
  recoverSigner: (encodedABI: Hex) => Promise<string>
}

export enum Action {
  CREATE = 'Create',
  UPDATE = 'Update',
  DELETE = 'Delete',
  VERIFY = 'Verify',
  FOLLOW = 'Follow',
  UNFOLLOW = 'Unfollow',
  SAVE = 'Save',
  SHARE = 'Share',
  UNSAVE = 'Unsave',
  REPOST = 'Repost',
  UNREPOST = 'Unrepost',
  SUBSCRIBE = 'Subscribe',
  UNSUBSCRIBE = 'Unsubscribe',
  VIEW = 'View',
  VIEW_PLAYLIST = 'ViewPlaylist',
  APPROVE = 'Approve',
  REJECT = 'Reject',
  DOWNLOAD = 'Download',
  REACT = 'React',
  UNREACT = 'Unreact',
  REPORT = 'Report',
  PIN = 'Pin',
  UNPIN = 'Unpin',
  MUTE = 'Mute',
  UNMUTE = 'Unmute',
  ADD_EMAIL = 'AddEmail',
  GRANT_ACCESS = 'GrantAccess'
}

export enum EntityType {
  PLAYLIST = 'Playlist',
  TRACK = 'Track',
  USER = 'User',
  USER_REPLICA_SET = 'UserReplicaSet',
  NOTIFICATION = 'Notification',
  DEVELOPER_APP = 'DeveloperApp',
  GRANT = 'Grant',
  DASHBOARD_WALLET_USER = 'DashboardWalletUser',
  TIP = 'Tip',
  COMMENT = 'Comment',
  ENCRYPTED_EMAIL = 'EncryptedEmail',
  EMAIL_ACCESS = 'EmailAccess',
  ASSOCIATED_WALLET = 'AssociatedWallet',
  COLLECTIBLES = 'Collectibles',
  EVENT = 'Event'
}

export type AdvancedOptions = {
  /**
   * Timeout confirmation of the write
   */
  confirmationTimeout?: number
  /**
   * Skip confirmation of the write
   */
  skipConfirmation?: boolean
}

export type ManageEntityOptions = {
  /**
   * The numeric user id
   */
  userId?: number
  /**
   * The type of entity being modified
   */
  entityType: EntityType
  /**
   * The id of the entity
   */
  entityId: number
  /**
   * Action being performed on the entity
   */
  action: Action
  /**
   * Metadata associated with the action
   */
  metadata?: string
} & AdvancedOptions

export enum BlockConfirmation {
  CONFIRMED = 'CONFIRMED',
  DENIED = 'DENIED',
  UNKNOWN = 'UNKNOWN'
}
