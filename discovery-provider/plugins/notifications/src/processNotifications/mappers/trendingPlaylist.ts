import { Knex } from 'knex'
import { NotificationRow, PlaylistRow, UserRow } from '../../types/dn'
import { TrendingPlaylistNotification } from '../../types/notifications'
import { BaseNotification } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import { EntityType } from '../../email/notifications/types'
import {
  buildUserNotificationSettings,
  Device
} from './userNotificationSettings'

type TrendingPlaylistNotificationRow = Omit<NotificationRow, 'data'> & {
  data: TrendingPlaylistNotification
}

export class TrendingPlaylist extends BaseNotification<TrendingPlaylistNotificationRow> {
  receiverUserId: number
  playlistId: number
  rank: number
  genre: string
  timeRange: string

  constructor(
    dnDB: Knex,
    identityDB: Knex,
    notification: TrendingPlaylistNotificationRow
  ) {
    super(dnDB, identityDB, notification)
    const userIds: number[] = this.notification.user_ids!
    this.receiverUserId = userIds[0]
    this.playlistId = this.notification.data.playlist_id
    this.rank = this.notification.data.rank
    this.genre = this.notification.data.genre
    this.timeRange = this.notification.data.time_range
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

    const playlistRes: Array<{ playlist_id: number; playlist_name: string }> =
      await this.dnDB
        .select('playlist_id', 'playlist_name')
        .from<PlaylistRow>('playlists')
        .where('is_current', true)
        .whereIn('playlist_id', [this.playlistId])

    const playlists = playlistRes.reduce((acc, playlist) => {
      const { playlist_id, playlist_name } = playlist
      acc[playlist_id] = { playlist_name }
      return acc
    }, {} as Record<number, { playlist_name: string }>)

    // Get the user's notification setting from identity service
    const userNotificationSettings = await buildUserNotificationSettings(
      this.identityDB,
      [this.receiverUserId]
    )

    const notificationReceiverUserId = this.receiverUserId
    // If the user has devices to the notification to, proceed
    if (
      userNotificationSettings.shouldSendPushNotification({
        receiverUserId: notificationReceiverUserId
      })
    ) {
      const devices: Device[] = userNotificationSettings.getDevices(
        notificationReceiverUserId
      )
      // If the user's settings for the follow notification is set to true, proceed
      await Promise.all(
        devices.map((device) => {
          return sendPushNotification(
            {
              type: device.type,
              badgeCount:
                userNotificationSettings.getBadgeCount(
                  notificationReceiverUserId
                ) + 1,
              targetARN: device.awsARN
            },
            {
              title: "📈 You're Trending",
              body: `${playlists[this.playlistId]?.playlist_name} is the #${
                this.rank
              } trending playlist on Audius right now!`,
              data: {}
            }
          )
        })
      )
      await this.incrementBadgeCount(this.receiverUserId)
    }

    if (isLiveEmailEnabled && 
      userNotificationSettings.shouldSendEmail({
        receiverUserId: notificationReceiverUserId
      })

      ) {
      // TODO: send out email
    }
  }

  getResourcesForEmail(): ResourceIds {
    return {
      users: new Set([this.receiverUserId]),
      playlists: new Set([this.playlistId])
    }
  }

  formatEmailProps(resources: Resources) {
    const user = resources.users[this.receiverUserId]
    const playlist = resources.playlists[this.playlistId]
    return {
      type: this.notification.type,
      rank: this.rank,
      users: [{ name: user.name, image: user.imageUrl }],
      entity: {
        type: EntityType.Playlist,
        title: playlist.playlist_name,
        image: playlist.imageUrl,
        slug: playlist.slug
      }
    }
  }
}
