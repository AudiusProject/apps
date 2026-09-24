import type {
  ID,
  AllTrackingEvents as CommonTrackingEvents,
  Name
} from '@audius/common/models'
import { Name as CommonEventNames } from '@audius/common/models'

enum MobileEventNames {
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
  OFFLINE_MODE_PLAY = 'Offline Mode: Offline Play'
}

export const EventNames = { ...CommonEventNames, ...MobileEventNames }

/** Mobile-only events that are never sampled (share channels) */
export const MOBILE_CORE_EVENTS: readonly string[] = [
  MobileEventNames.SHARE_TO_IG_STORY,
  MobileEventNames.SHARE_TO_IG_STORY_CANCELLED,
  MobileEventNames.SHARE_TO_IG_STORY_ERROR,
  MobileEventNames.SHARE_TO_IG_STORY_SUCCESS,
  MobileEventNames.SHARE_TO_SNAPCHAT,
  MobileEventNames.SHARE_TO_SNAPCHAT_CANCELLED,
  MobileEventNames.SHARE_TO_SNAPCHAT_ERROR,
  MobileEventNames.SHARE_TO_SNAPCHAT_STORY_SUCCESS,
  MobileEventNames.SHARE_TO_TIKTOK_VIDEO,
  MobileEventNames.SHARE_TO_TIKTOK_VIDEO_CANCELLED,
  MobileEventNames.SHARE_TO_TIKTOK_VIDEO_ERROR,
  MobileEventNames.SHARE_TO_TIKTOK_VIDEO_SUCCESS
]

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

type OfflineModePlay = {
  eventName: MobileEventNames.OFFLINE_MODE_PLAY
  trackId: ID
}

type MobileTrackingEvents =
  | NotificationsOpenPushNotification
  | ShareToIGStory
  | ShareToIGStoryError
  | ShareToSnapchat
  | ShareToSnapchatError
  | ShareToTikTokVideo
  | ShareToTikTokVideoError
  | OfflineModePlay

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
