import { Permission } from '~/utils/browserNotifications'

export enum BrowserNotificationSetting {
  BrowserPush = 'browserPush',
  MilestonesAndAchievements = 'milestonesAndAchievements',
  Followers = 'followers',
  Reposts = 'reposts',
  Favorites = 'favorites',
  Permission = 'permission',
  Remixes = 'remixes',
  Messages = 'messages',
  Comments = 'comments',
  Mentions = 'mentions',
  Reactions = 'reactions'
}

export enum PushNotificationSetting {
  MobilePush = 'mobilePush',
  MilestonesAndAchievements = 'milestonesAndAchievements',
  Followers = 'followers',
  Reposts = 'reposts',
  Favorites = 'favorites',
  Remixes = 'remixes',
  Messages = 'messages',
  Comments = 'comments',
  Mentions = 'mentions',
  Reactions = 'reactions'
}

export enum EmailFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
  Off = 'off'
}

export const emailFrequency = 'emailFrequency'

export type Notifications = {
  [BrowserNotificationSetting.Permission]: Permission | null
  [BrowserNotificationSetting.BrowserPush]: boolean
  [BrowserNotificationSetting.MilestonesAndAchievements]: boolean
  [BrowserNotificationSetting.Followers]: boolean
  [BrowserNotificationSetting.Reposts]: boolean
  [BrowserNotificationSetting.Favorites]: boolean
  [BrowserNotificationSetting.Remixes]: boolean
  [BrowserNotificationSetting.Messages]: boolean
  [BrowserNotificationSetting.Comments]: boolean
  [BrowserNotificationSetting.Mentions]: boolean
  [BrowserNotificationSetting.Reactions]: boolean
}

export type PushNotifications = {
  [PushNotificationSetting.MobilePush]: boolean
  [PushNotificationSetting.MilestonesAndAchievements]: boolean
  [PushNotificationSetting.Followers]: boolean
  [PushNotificationSetting.Reposts]: boolean
  [PushNotificationSetting.Favorites]: boolean
  [PushNotificationSetting.Remixes]: boolean
  [PushNotificationSetting.Messages]: boolean
  [PushNotificationSetting.Comments]: boolean
  [PushNotificationSetting.Mentions]: boolean
  [PushNotificationSetting.Reactions]: boolean
}

export enum Cast {
  AIRPLAY = 'AIRPLAY',
  CHROMECAST = 'CHROMECAST'
}

export type SettingsPageState = {
  browserNotifications: Notifications
  pushNotifications: PushNotifications
  emailFrequency: EmailFrequency
}
