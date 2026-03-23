import type {
  ID,
  AllTrackingEvents as CommonTrackingEvents,
  Name
} from '@audius/common/models'
import { Name as CommonEventNames } from '@audius/common/models'

import type { OfflineJob } from 'app/store/offline-downloads/slice'

enum MobileEventNames {
  APP_ERROR = 'App Unexpected Error',
  SHARE_TO_IG_STORY = 'Share to Instagram story - start',
  SHARE_TO_IG_STORY_CANCELLED = 'Share to Instagram story - cancelled',
  SHARE_TO_IG_STORY_ERROR = 'Share to Instagram story - error',
  SHARE_TO_IG_STORY_SUCCESS = 'Share to Instagram story - success',
  SHARE_TO_SNAPCHAT = 'Share to Snapchat - start',
  SHARE_TO_SNAPCHAT_CANCELLED = 'Share to Snapchat - cancelled',
  SHARE_TO_SNAPCHAT_ERROR = 'Share to Snapchat - error',
  SHARE_TO_SNAPCHAT_STORY_SUCCESS = 'Share to Snapchat - success',
  SHARE_TO_TIKTOK_VIDEO = 'Share to TikTok (video) - start',
  SHARE_TO_TIKTOK_VIDEO_CANCELLED = 'Share to TikTok (video) - cancelled',
  SHARE_TO_TIKTOK_VIDEO_ERROR = 'Share to TikTok (video) - error',
  SHARE_TO_TIKTOK_VIDEO_SUCCESS = 'Share to TikTok (video) - success',

  // Offline Mode
  OFFLINE_MODE_DOWNLOAD_ALL_TOGGLE_ON = 'Offline Mode: Download All Toggle On',
  OFFLINE_MODE_DOWNLOAD_ALL_TOGGLE_OFF = 'Offline Mode: Download All Toggle Off',
  OFFLINE_MODE_DOWNLOAD_COLLECTION_TOGGLE_ON = 'Offline Mode: Download Collection Toggle On',
  OFFLINE_MODE_DOWNLOAD_COLLECTION_TOGGLE_OFF = 'Offline Mode: Download Collection Toggle Off',
  OFFLINE_MODE_DOWNLOAD_REQUEST = 'Offline Mode: Download Item Request',
  OFFLINE_MODE_DOWNLOAD_START = 'Offline Mode: Download Item Start',
  OFFLINE_MODE_DOWNLOAD_SUCCESS = 'Offline Mode: Download Item Success',
  OFFLINE_MODE_DOWNLOAD_FAILURE = 'Offline Mode: Download Item Failure',
  OFFLINE_MODE_REMOVE_ITEM = 'Offline Mode: Remove Item',
  OFFLINE_MODE_PLAY = 'Offline Mode: Offline Play',
  OFFLINE_MODE_FILEPATH_MIGRATION_STARTED = 'Offline Mode: File path migration started',
  OFFLINE_MODE_FILEPATH_MIGRATION_SUCCESS = 'Offline Mode: File path migration succeeded',
  OFFLINE_MODE_FILEPATH_MIGRATION_FAILURE = 'Offline Mode: File path migration failed'
}

export const EventNames = { ...CommonEventNames, ...MobileEventNames }

type NotificationsOpenPushNotification = {
  eventName: Name.NOTIFICATIONS_OPEN_PUSH_NOTIFICATION
  title?: string
  body?: string
  /** Matches Amplitude / engagement sync join key */
  notificationCampaignId?: string
}

type ShareToIGStory = {
  eventName:
    | MobileEventNames.SHARE_TO_IG_STORY
    | MobileEventNames.SHARE_TO_IG_STORY_CANCELLED
    | MobileEventNames.SHARE_TO_IG_STORY_SUCCESS
  title?: string
  artist?: string
}

type ShareToSnapchat = {
  eventName:
    | MobileEventNames.SHARE_TO_SNAPCHAT
    | MobileEventNames.SHARE_TO_SNAPCHAT_CANCELLED
    | MobileEventNames.SHARE_TO_SNAPCHAT_STORY_SUCCESS
  title?: string
  artist?: string
}

type ShareToTikTokVideo = {
  eventName:
    | MobileEventNames.SHARE_TO_TIKTOK_VIDEO
    | MobileEventNames.SHARE_TO_TIKTOK_VIDEO_CANCELLED
    | MobileEventNames.SHARE_TO_TIKTOK_VIDEO_SUCCESS
  title?: string
  artist?: string
}

type ShareToIGStoryError = {
  eventName: MobileEventNames.SHARE_TO_IG_STORY_ERROR
  title?: string
  artist?: string
  error: string
}

type ShareToSnapchatError = {
  eventName: MobileEventNames.SHARE_TO_SNAPCHAT_ERROR
  title?: string
  artist?: string
  error: string
}

type ShareToTikTokVideoError = {
  eventName: MobileEventNames.SHARE_TO_TIKTOK_VIDEO_ERROR
  title?: string
  artist?: string
  error: string
}

type AppError = {
  eventName: MobileEventNames.APP_ERROR
  message?: string
}

type OfflineModeDownloadAllToggleOn = {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_ALL_TOGGLE_ON
}

type OfflineModeDownloadAllToggleOff = {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_ALL_TOGGLE_OFF
}

type OfflineModeDownloadCollectionToggleOn = {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_COLLECTION_TOGGLE_ON
  collectionId: ID
}

type OfflineModeDownloadCollectionToggleOff = {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_COLLECTION_TOGGLE_OFF
  collectionId: ID
}

type OfflineModeDownloadRequest = OfflineJob & {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_REQUEST
}

type OfflineModeDownloadStart = OfflineJob & {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_START
}

type OfflineModeDownloadSuccess = OfflineJob & {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_SUCCESS
}

type OfflineModeDownloadFailure = OfflineJob & {
  eventName: MobileEventNames.OFFLINE_MODE_DOWNLOAD_FAILURE
}

type OfflineModeRemoveItem = OfflineJob & {
  eventName: MobileEventNames.OFFLINE_MODE_REMOVE_ITEM
}

type OfflineModePlay = {
  eventName: MobileEventNames.OFFLINE_MODE_PLAY
  trackId: ID
}

type OfflineFilePathMigrationStarted = {
  eventName: MobileEventNames.OFFLINE_MODE_FILEPATH_MIGRATION_STARTED
}
type OfflineFilePathMigrationSucceess = {
  eventName: MobileEventNames.OFFLINE_MODE_FILEPATH_MIGRATION_SUCCESS
}
type OfflineFilePathMigrationFailed = {
  eventName: MobileEventNames.OFFLINE_MODE_FILEPATH_MIGRATION_FAILURE
}

type MobileTrackingEvents =
  | NotificationsOpenPushNotification
  | AppError
  | ShareToIGStory
  | ShareToIGStoryError
  | ShareToSnapchat
  | ShareToSnapchatError
  | ShareToTikTokVideo
  | ShareToTikTokVideoError
  | OfflineModeDownloadAllToggleOn
  | OfflineModeDownloadAllToggleOff
  | OfflineModeDownloadCollectionToggleOn
  | OfflineModeDownloadCollectionToggleOff
  | OfflineModeDownloadFailure
  | OfflineModeDownloadRequest
  | OfflineModeDownloadStart
  | OfflineModeDownloadSuccess
  | OfflineModeRemoveItem
  | OfflineModePlay
  | OfflineFilePathMigrationStarted
  | OfflineFilePathMigrationSucceess
  | OfflineFilePathMigrationFailed

export type AllEvents = CommonTrackingEvents | MobileTrackingEvents

export type JsonMap = Record<string, unknown>

export type Track = {
  eventName: string
  properties?: JsonMap
}

export type Screen = {
  route: string
  properties?: JsonMap
}

export {
  PlaybackSource,
  ShareSource,
  RepostSource,
  FavoriteSource,
  FollowSource,
  CreatePlaylistSource
} from '@audius/common/models'
