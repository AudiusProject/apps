import { Knex } from 'knex'
import { NotificationRow, UserRow } from '../../types/dn'
import {
  AppEmailNotification,
  ChallengeRewardNotification
} from '../../types/notifications'
import { BaseNotification } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import { ChallengeId } from '../../email/notifications/types'
import { AUDIO_DIVISOR, formatWei } from '../../utils/format'
import { sendNotificationEmail } from '../../email/notifications/sendEmail'
import {
  buildUserNotificationSettings,
  Device
} from './userNotificationSettings'
import { sendBrowserNotification } from '../../web'
import { disableDeviceArns } from '../../utils/disableArnEndpoint'

type ChallengeRewardRow = Omit<NotificationRow, 'data'> & {
  data: ChallengeRewardNotification
}
export class ChallengeReward extends BaseNotification<ChallengeRewardRow> {
  receiverUserId: number
  amount: number
  specifier: string
  challengeId: ChallengeId

  challengeInfoMap = {
    p: {
      title: '✅️ Complete your Profile',
      amount: 1
    },
    l: {
      title: '🎧 Listening Streak: 7 Days',
      amount: 1
    },
    u: {
      title: '🎶 Upload 3 Tracks',
      amount: 1
    },
    r: {
      title: '📨 Invite your Friends',
      amount: 1
    },
    rd: {
      title: '📨 Invite your Friends',
      amount: 1
    },
    rv: {
      title: '📨 Invite your Fans',
      amount: 1
    },
    v: {
      title: '✅️ Link Verified Accounts',
      amount: 5
    },
    m: {
      title: '📲 Get the App',
      amount: 1
    },
    ft: {
      title: '🤑 Send Your First Tip',
      amount: 2
    },
    fp: {
      title: '🎼 Create a Playlist',
      amount: 2
    },
    o: {
      title: 'Airdrop 2: Artist Appreciation'
    },
    w: {
      title: '🏆 Remix Contest Winner',
      amount: 1000
    }
  }

  constructor(dnDB: Knex, identityDB: Knex, notification: ChallengeRewardRow) {
    super(dnDB, identityDB, notification)
    const userIds: number[] = this.notification.user_ids!
    this.receiverUserId = userIds[0]
    this.amount = this.notification.data.amount
    this.specifier = this.notification.data.specifier
    this.challengeId = this.notification.data.challenge_id
  }

  getPushBodyText() {
    // Check if the challenge ID exists in our map
    const challengeInfo = this.challengeInfoMap[this.challengeId]
    if (!challengeInfo) {
      return `You've earned ${
        this.amount / AUDIO_DIVISOR
      } $AUDIO for completing this challenge!`
    }

    if (this.challengeId === 'rd') {
      const amount = 'amount' in challengeInfo ? challengeInfo.amount : 1
      return `You've received ${amount} $AUDIO for being referred! Invite your friends to join to earn more!`
    } else if (this.challengeId === 'o') {
      return `You've earned ${
        this.amount / AUDIO_DIVISOR
      } $AUDIO for completing this challenge!`
    }

    // Check if amount exists on challengeInfo
    if ('amount' in challengeInfo && challengeInfo.amount) {
      return `You've earned ${challengeInfo.amount} $AUDIO for completing this challenge!`
    }

    return `You've earned ${
      this.amount / AUDIO_DIVISOR
    } $AUDIO for completing this challenge!`
  }

  async processNotification({
    isLiveEmailEnabled,
    isBrowserPushEnabled
  }: {
    isLiveEmailEnabled: boolean
    isBrowserPushEnabled: boolean
  }) {
    const res: Array<{
      user_id: number
      name: string
      is_deactivated: boolean
    }> = await this.dnDB
      .select('user_id', 'name', 'is_deactivated')
      .from<UserRow>('users')
      .where('is_current', true)
      .whereIn('user_id', [this.receiverUserId])
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
      [this.receiverUserId]
    )

    // Check if the challenge ID exists in our map, provide fallback if not
    const challengeInfo = this.challengeInfoMap[this.challengeId]
    if (!challengeInfo) {
      console.warn(
        `Unknown challenge ID: ${this.challengeId}, skipping notification`
      )
      return
    }

    const title = challengeInfo.title
    const body = this.getPushBodyText()
    await sendBrowserNotification(
      isBrowserPushEnabled,
      userNotificationSettings,
      this.receiverUserId,
      title,
      body
    )

    // If the user has devices to the notification to, proceed
    if (
      userNotificationSettings.shouldSendPushNotification({
        receiverUserId: this.receiverUserId
      })
    ) {
      const devices: Device[] = userNotificationSettings.getDevices(
        this.receiverUserId
      )
      const pushes = await Promise.all(
        devices.map((device) => {
          return sendPushNotification(
            {
              type: device.type,
              badgeCount:
                userNotificationSettings.getBadgeCount(this.receiverUserId) + 1,
              targetARN: device.awsARN
            },
            {
              title,
              body,
              data: {
                id: `timestamp:${this.getNotificationTimestamp()}:group_id:${
                  this.notification.group_id
                }`,
                type: 'ChallengeReward'
              }
            }
          )
        })
      )
      await disableDeviceArns(this.identityDB, pushes)
      await this.incrementBadgeCount(this.receiverUserId)
    }

    if (
      isLiveEmailEnabled &&
      userNotificationSettings.shouldSendEmailAtFrequency({
        receiverUserId: this.receiverUserId,
        frequency: 'live'
      })
    ) {
      const notification: AppEmailNotification = {
        receiver_user_id: this.receiverUserId,
        ...this.notification
      }
      await sendNotificationEmail({
        userId: this.receiverUserId,
        email: userNotificationSettings.getUserEmail(this.receiverUserId),
        frequency: 'live',
        notifications: [notification],
        dnDb: this.dnDB,
        identityDb: this.identityDB
      })
    }
  }

  getResourcesForEmail(): ResourceIds {
    return {
      users: new Set([this.receiverUserId])
    }
  }

  formatEmailProps(resources: Resources) {
    const receiverUser = resources.users[this.receiverUserId]
    return {
      type: this.notification.type,
      challengeId: this.challengeId,
      rewardAmount: formatWei(this.amount.toString(), 'sol')
    }
  }
}
