import { Knex } from 'knex'
import { NotificationRow, UserRow } from '../../types/dn'
import {
  AppEmailNotification,
  FollowNotification
} from '../../types/notifications'
import { BaseNotification } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import { sendNotificationEmail } from '../../email/notifications/sendEmail'
import {
  buildUserNotificationSettings,
  Device
} from './userNotificationSettings'

type FollowNotificationRow = Omit<NotificationRow, 'data'> & {
  data: FollowNotification
}
export class Follow extends BaseNotification<FollowNotificationRow> {
  receiverUserId: number
  followerUserId: number

  constructor(
    dnDB: Knex,
    identityDB: Knex,
    notification: FollowNotificationRow
  ) {
    super(dnDB, identityDB, notification)
    const userIds = this.notification.user_ids!
    const followeeUserId = userIds[0]
    this.followerUserId = this.notification.data.follower_user_id
    this.receiverUserId = followeeUserId
  }

  async pushNotification({
    isLiveEmailEnabled
  }: {
    isLiveEmailEnabled: boolean
  }) {
    const res: Array<{
      user_id: number
      name: string
      is_deactivated: boolean
    }> = await this.dnDB
      .select('user_id', 'name', 'is_deactivated')
      .from<UserRow>('users')
      .where('is_current', true)
      .whereIn('user_id', [this.receiverUserId, this.followerUserId])
    const users = res.reduce((acc, user) => {
      acc[user.user_id] = {
        name: user.name,
        isDeactivated: user.is_deactivated
      }
      return acc
    }, {} as Record<number, { name: string; isDeactivated: boolean }>)

    if (users?.[this.receiverUserId]?.isDeactivated) {
      return
    }

    // Get the user's notification setting from identity service
    const userNotificationSettings = await buildUserNotificationSettings(
      this.identityDB,
      [this.receiverUserId, this.followerUserId]
    )
    // If the user has devices to the notification to, proceed
    if (
      userNotificationSettings.shouldSendPushNotification({
        initiatorUserId: this.followerUserId,
        receiverUserId: this.receiverUserId
      }) &&
      userNotificationSettings.isNotificationTypeEnabled(
        this.receiverUserId,
        'followers'
      )
    ) {
      const devices: Device[] = userNotificationSettings.getDevices(
        this.receiverUserId
      )
      // If the user's settings for the follow notification is set to true, proceed
      await Promise.all(
        devices.map((device) => {
          return sendPushNotification(
            {
              type: device.type,
              badgeCount:
                userNotificationSettings.getBadgeCount(this.receiverUserId) + 1,
              targetARN: device.awsARN
            },
            {
              title: 'Follow',
              body: `${users[this.followerUserId].name} followed you`,
              data: {
                id: `timestamp:${this.getNotificationTimestamp()}:group_id:${
                  this.notification.group_id
                }`,
                userIds: [this.followerUserId],
                type: 'Follow'
              }
            }
          )
        })
      )
      await this.incrementBadgeCount(this.receiverUserId)
    }

    if (
      isLiveEmailEnabled &&
      userNotificationSettings.shouldSendEmail({
        receiverUserId: this.receiverUserId,
        initiatorUserId: this.followerUserId
      })
    ) {
      const notification: AppEmailNotification = {
        receiver_user_id: this.receiverUserId,
        ...this.notification
      }
      await sendNotificationEmail({
        userId: this.receiverUserId,
        userNotificationSettings,
        notifications: [notification],
        dnDb: this.dnDB,
        identityDb: this.identityDB
      })
    }
  }

  getResourcesForEmail(): ResourceIds {
    return {
      users: new Set([this.receiverUserId, this.followerUserId])
    }
  }

  formatEmailProps(
    resources: Resources,
    additionalGroupNotifications: Follow[] = []
  ) {
    const user = resources.users[this.followerUserId]
    const additionalUsers = additionalGroupNotifications.map(
      (follow) => resources.users[follow.followerUserId]
    )
    return {
      type: this.notification.type,
      users: [user, ...additionalUsers]
    }
  }
}
