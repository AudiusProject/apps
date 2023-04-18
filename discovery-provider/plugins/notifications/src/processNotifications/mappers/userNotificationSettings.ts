import { Knex } from 'knex'
import moment from 'moment'

export type DeviceType = 'ios' | 'android'

export type EmailFrequency = 'off' | 'live' | 'daily' | 'weekly'

export type WebPush = {
  endpoint: string
  p256dhKey: string
  authKey: string
}
export type SafariPush = {
  type: string
  awsARN: string
  deviceToken: string
}
export type Browser = WebPush | SafariPush

export type Device = {
  type: DeviceType
  awsARN: string
  deviceToken: string
}

export type NotificationSettings = {
  favorites: boolean
  milestonesAndAchievements: boolean
  reposts: boolean
  announcements: boolean
  followers: boolean
  remixes: boolean
  messages: boolean
}

type UserBrowserSettings = {
  [userId: number]: {
    settings: NotificationSettings
    browser: Browser[]
  }
}
type UserMobileSettings = {
  [userId: number]: {
    settings: NotificationSettings
    badgeCount: number
    devices: Device[]
  }
}

type UserEmailSettings = {
  [userId: number]: { frequency: EmailFrequency; email: string }
}

export class UserNotificationSettings {
  identityDB: Knex
  mobile: object
  browser: object
  email: object
  userIsAbusive: object
  userIsEmailDeliverable: object
  userTimezone: object

  constructor(identityDB: Knex) {
    this.identityDB = identityDB
    this.mobile = {}
    this.browser = {}
    this.email = {}
    this.userIsAbusive = {}
    this.userIsEmailDeliverable = {}
    this.userTimezone = {}
  }

  /**
   * Fetches the user's notification settings
   *
   * @param userIds User id to fetch notification settings for
   * @returns
   */
  async initializeUserNotificationSettings(userIds: number[]) {
    const [
      userMobileNotificationSettings,
      userBrowserNotificationSettings,
      userEmailSettings,
      userAbusiveSettings
    ] = await Promise.all([
      this.getUserMobileNotificationSettings(userIds),
      this.getUserBrowserSettings(userIds),
      this.getUserEmailSettings(userIds),
      this.getUserAbusiveSettings(userIds)
    ])
    this.mobile = userMobileNotificationSettings
    this.browser = userBrowserNotificationSettings
    this.email = userEmailSettings
    this.userIsAbusive = userAbusiveSettings.usersAbuseMap
    this.userIsEmailDeliverable = userAbusiveSettings.usersIsEmailDeliverableMap
    this.userTimezone = userAbusiveSettings.usersTimezoneMap
  }

  isNotificationTypeEnabled(userId: number, feature: string) {
    return this.mobile?.[userId].settings[feature]
  }

  shouldSendPushNotification({
    initiatorUserId,
    receiverUserId
  }: {
    initiatorUserId?: number
    receiverUserId: number
  }) {
    const isInitiatorAbusive = initiatorUserId
      ? this.userIsAbusive[initiatorUserId.toString()]
      : false

    return (
      (this.mobile?.[receiverUserId]?.devices ?? []).length > 0 &&
      !isInitiatorAbusive &&
      !this.userIsAbusive[receiverUserId]
    )
  }

  getDevices(userId: number) {
    return this.mobile?.[userId].devices
  }

  getBadgeCount(userId: number) {
    return this.mobile[userId].badgeCount
  }

  getUserEmail(userId: number) {
    return this.email?.[userId].email
  }

  getUserEmailFrequency(userId: number) {
    return this.email?.[userId].frequency
  }

  shouldSendEmailAtFrequency({
    initiatorUserId,
    receiverUserId,
    frequency
  }: {
    initiatorUserId?: number
    receiverUserId: number
    frequency: string
  }) {
    const { userIsAbusive } = this
    const isInitiatorAbusive = initiatorUserId
      ? userIsAbusive[initiatorUserId]
      : false
    return (
      this.userIsEmailDeliverable[receiverUserId] &&
      !isInitiatorAbusive &&
      !userIsAbusive[receiverUserId] &&
      this.email?.[receiverUserId].frequency === frequency
    )
  }

  async getUserAbusiveSettings(userIds: number[]) {
    const users: Array<{
      blockchainUserId: number
      isBlockedFromNotifications: boolean
      isBlockedFromRelay: boolean
      isEmailDeliverable: boolean
      timezone: string
    }> = await this.identityDB
      .select(
        'Users.blockchainUserId',
        'Users.isBlockedFromNotifications',
        'Users.isBlockedFromRelay',
        'Users.isEmailDeliverable',
        'Users.timezone'
      )
      .from('Users')
      .whereIn('Users.blockchainUserId', userIds)

    const usersAbuseMap = {}
    const usersIsEmailDeliverableMap = {}
    const usersTimezoneMap = {}
    users.forEach((user) => {
      usersAbuseMap[user.blockchainUserId] =
        user.isBlockedFromRelay || user.isBlockedFromNotifications
    })
    users.forEach((user) => {
      usersIsEmailDeliverableMap[user.blockchainUserId] =
        user.isEmailDeliverable
    })
    users.forEach((user) => {
      usersTimezoneMap[user.blockchainUserId] = user.timezone
    })

    return {
      usersAbuseMap,
      usersIsEmailDeliverableMap,
      usersTimezoneMap
    }
  }

  /**
   * Fetches the user's mobile push notification settings
   *
   * @param userIds User ids to fetch notification settings
   * @returns
   */
  async getUserMobileNotificationSettings(
    userIds: number[]
  ): Promise<UserMobileSettings> {
    const userNotifSettingsMobile: Array<{
      userId: number
      favorites: boolean
      milestonesAndAchievements: boolean
      reposts: boolean
      announcements: boolean
      followers: boolean
      remixes: boolean
      messages: boolean
      deviceType: string
      awsARN: string
      deviceToken: string
      iosBadgeCount: number | null
    }> = await this.identityDB
      .select(
        'UserNotificationMobileSettings.userId',
        'UserNotificationMobileSettings.favorites',
        'UserNotificationMobileSettings.milestonesAndAchievements',
        'UserNotificationMobileSettings.reposts',
        'UserNotificationMobileSettings.announcements',
        'UserNotificationMobileSettings.followers',
        'UserNotificationMobileSettings.remixes',
        'UserNotificationMobileSettings.messages',
        'NotificationDeviceTokens.deviceType',
        'NotificationDeviceTokens.awsARN',
        'NotificationDeviceTokens.deviceToken',
        'PushNotificationBadgeCounts.iosBadgeCount'
      )
      .from('UserNotificationMobileSettings')
      .innerJoin(
        'NotificationDeviceTokens',
        'NotificationDeviceTokens.userId',
        '=',
        'UserNotificationMobileSettings.userId'
      )
      .leftJoin(
        'PushNotificationBadgeCounts',
        'PushNotificationBadgeCounts.userId',
        '=',
        'UserNotificationMobileSettings.userId'
      )
      .whereIn('UserNotificationMobileSettings.userId', userIds)
      .andWhere('NotificationDeviceTokens.enabled', '=', true)
      .whereIn('NotificationDeviceTokens.deviceType', ['ios', 'android'])

    const userMobileSettings = userNotifSettingsMobile.reduce(
      (acc, setting) => {
        acc[setting.userId] = {
          settings: {
            favorites: setting.favorites,
            milestonesAndAchievements: setting.milestonesAndAchievements,
            reposts: setting.reposts,
            announcements: setting.announcements,
            followers: setting.followers,
            remixes: setting.remixes,
            messages: setting.messages
          },
          devices: [
            ...(acc?.[setting.userId]?.devices ?? []),
            {
              type: setting.deviceType as DeviceType,
              awsARN: setting.awsARN,
              deviceToken: setting.deviceToken
            }
          ],
          badgeCount: setting.iosBadgeCount || 0
        }
        return acc
      },
      {} as UserMobileSettings
    )
    return userMobileSettings
  }

  /**
   * Fetches the user's mobile push notification settings
   *
   * @param userIds User ids to fetch notification settings
   * @returns
   */
  async getUserEmailSettings(
    userIds: number[],
    frequency?: EmailFrequency
  ): Promise<UserEmailSettings> {
    const userNotifSettings: Array<{
      userId: number
      emailFrequency: EmailFrequency
      email: string
    }> = await this.identityDB
      .select(
        'UserNotificationSettings.userId',
        'UserNotificationSettings.emailFrequency',
        'Users.email'
      )
      .from('UserNotificationSettings')
      .join(
        'Users',
        'Users.blockchainUserId',
        'UserNotificationSettings.userId'
      )
      .whereIn('UserNotificationSettings.userId', userIds)
      .modify((queryBuilder) => {
        if (frequency) {
          queryBuilder.where('emailFrequency', frequency)
        }
      })
    const userEmailSettings: UserEmailSettings = userNotifSettings.reduce(
      (acc, user) => {
        acc[user.userId] = { email: user.email, frequency: user.emailFrequency }
        return acc
      },
      {} as UserEmailSettings
    )
    return userEmailSettings
  }

  /**
   * Fetches the user's browser push notification settings
   *
   * @param userIds User ids to fetch notification settings
   * @returns
   */
  async getUserBrowserSettings(
    userIds: number[]
  ): Promise<UserBrowserSettings> {
    const userNotifSettingsBrowser: Array<{
      userId: number
      favorites: boolean
      milestonesAndAchievements: boolean
      reposts: boolean
      announcements: boolean
      followers: boolean
      remixes: boolean
      messages: boolean
      deviceType?: string
      awsARN?: string
      deviceToken?: string
      endpoint?: string
      p256dhKey?: string
      authKey?: string
    }> = await this.identityDB
      .select(
        'UserNotificationBrowserSettings.userId',
        'UserNotificationBrowserSettings.favorites',
        'UserNotificationBrowserSettings.milestonesAndAchievements',
        'UserNotificationBrowserSettings.reposts',
        'UserNotificationBrowserSettings.announcements',
        'UserNotificationBrowserSettings.followers',
        'UserNotificationBrowserSettings.remixes',
        'UserNotificationBrowserSettings.messages',
        'NotificationDeviceTokens.deviceType', // Note safari switch to web push protocol last yr for safari 16+
        'NotificationDeviceTokens.awsARN', // so these fields are no longer necessary if we don't want to support
        'NotificationDeviceTokens.deviceToken', // legacy safari push notifs
        'NotificationBrowserSubscriptions.endpoint',
        'NotificationBrowserSubscriptions.p256dhKey',
        'NotificationBrowserSubscriptions.authKey'
      )
      .from('UserNotificationBrowserSettings')
      .leftJoin(
        'NotificationDeviceTokens',
        'NotificationDeviceTokens.userId',
        'UserNotificationBrowserSettings.userId'
      )
      .leftJoin(
        'NotificationBrowserSubscriptions',
        'NotificationBrowserSubscriptions.userId',
        'UserNotificationBrowserSettings.userId'
      )
      .whereIn('UserNotificationBrowserSettings.userId', userIds)
      .whereIn('NotificationDeviceTokens.deviceType', ['safari'])
      .andWhere('NotificationDeviceTokens.enabled', true)
      .andWhere('NotificationBrowserSubscriptions.enabled', true)

    const userBrowserSettings = userNotifSettingsBrowser.reduce(
      (acc, setting) => {
        const safariSettings =
          setting.deviceType && setting.awsARN && setting.deviceToken
            ? {
                type: setting.deviceType,
                awsARN: setting.awsARN,
                deviceToken: setting.deviceToken
              }
            : undefined

        const webPushSettings =
          setting.endpoint && setting.p256dhKey && setting.authKey
            ? {
                endpoint: setting.endpoint,
                p256dhKey: setting.p256dhKey,
                authKey: setting.authKey
              }
            : undefined
        if (!safariSettings && !webPushSettings) {
          return acc
        }

        acc[setting.userId] = {
          settings: {
            favorites: setting.favorites,
            milestonesAndAchievements: setting.milestonesAndAchievements,
            reposts: setting.reposts,
            announcements: setting.announcements,
            followers: setting.followers,
            remixes: setting.remixes,
            messages: setting.messages
          },
          browser: acc?.[setting.userId]?.browser ?? []
        }
        if (safariSettings) {
          acc[setting.userId].browser.push(safariSettings)
        }
        if (webPushSettings) {
          acc[setting.userId].browser.push(webPushSettings)
        }
        return acc
      },
      {} as UserBrowserSettings
    )
    return userBrowserSettings
  }

  getUserSendAt(userId: number) {
    const timezone = this.userTimezone[userId]
    // const sendAt = moment.tz(timezone).add(1, 'day').startOf('day')
    const sendAt = moment.tz(timezone).add(30, 'second')
    // sendgrid's send api expects a send_at value in
    // unix timestamp in seconds
    return Math.floor(sendAt.toDate().getTime() / 1000)
  }
}

export async function buildUserNotificationSettings(
  db: Knex,
  userIds: number[]
) {
  const settings = new UserNotificationSettings(db)
  await settings.initializeUserNotificationSettings(userIds)
  return settings
}
