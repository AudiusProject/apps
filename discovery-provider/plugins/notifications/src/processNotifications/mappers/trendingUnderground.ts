import { Knex } from 'knex'
import { NotificationRow, TrackRow, UserRow } from '../../types/dn'
import { TrendingUndergroundNotification } from '../../types/notifications'
import { BaseNotification, Device } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import { EntityType } from '../../email/notifications/types'
import { getNumberSuffix } from '../../utils/format'

type TrendingUndergroundNotificationRow = Omit<NotificationRow, 'data'> & {
  data: TrendingUndergroundNotification
}
export class TrendingUnderground extends BaseNotification<TrendingUndergroundNotificationRow> {
  receiverUserId: number
  trackId: number
  rank: number
  genre: string
  timeRange: string

  constructor(
    dnDB: Knex,
    identityDB: Knex,
    notification: TrendingUndergroundNotificationRow
  ) {
    super(dnDB, identityDB, notification)
    const userIds: number[] = this.notification.user_ids!
    this.receiverUserId = userIds[0]
    this.trackId = this.notification.data.track_id
    this.rank = this.notification.data.rank
    this.genre = this.notification.data.genre
    this.timeRange = this.notification.data.time_range
  }

  async pushNotification() {
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

    const trackRes: Array<{ track_id: number; title: string }> = await this.dnDB
      .select('track_id', 'title')
      .from<TrackRow>('tracks')
      .where('is_current', true)
      .whereIn('track_id', [this.trackId])
    const tracks = trackRes.reduce((acc, track) => {
      acc[track.track_id] = { title: track.title }
      return acc
    }, {} as Record<number, { title: string }>)

    // Get the user's notification setting from identity service
    const userNotifications = await super.getShouldSendNotification(
      this.receiverUserId
    )

    const rankSuffix = getNumberSuffix(this.rank)

    // If the user has devices to the notification to, proceed
    if (
      (userNotifications.mobile?.[this.receiverUserId]?.devices ?? []).length >
      0
    ) {
      const devices: Device[] =
        userNotifications.mobile?.[this.receiverUserId].devices
      // If the user's settings for the follow notification is set to true, proceed
      await Promise.all(
        devices.map((device) => {
          return sendPushNotification(
            {
              type: device.type,
              badgeCount:
                userNotifications.mobile[this.receiverUserId].badgeCount + 1,
              targetARN: device.awsARN
            },
            {
              title: 'Congrats - You’re Trending! 📈',
              body: `Your Track ${tracks[this.trackId]?.title} is ${
                this.rank
              }${rankSuffix} on Underground Trending Right Now! 🍾`,
              data: {}
            }
          )
        })
      )
      await this.incrementBadgeCount(this.receiverUserId)
    }

    if (userNotifications.email) {
      // TODO: Send out email
    }
  }

  getResourcesForEmail(): ResourceIds {
    return {
      users: new Set([this.receiverUserId]),
      tracks: new Set([this.trackId])
    }
  }

  formatEmailProps(resources: Resources) {
    const user = resources.users[this.receiverUserId]
    const track = resources.tracks[this.trackId]
    console.log('uhh type?', this.notification.type)

    return {
      type: this.notification.type,
      rank: this.rank,
      users: [{ name: user.name, image: user.imageUrl }],
      entity: {
        type: EntityType.Track,
        title: track.title,
        image: track.imageUrl,
        slug: track.slug
      }
    }
  }
}
