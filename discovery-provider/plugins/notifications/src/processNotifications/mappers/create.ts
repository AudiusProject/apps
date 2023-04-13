import { Knex } from 'knex'
import { NotificationRow, PlaylistRow, TrackRow, UserRow } from '../../types/dn'
import {
  AppEmailNotification,
  CreatePlaylistNotification,
  CreateTrackNotification
} from '../../types/notifications'
import { BaseNotification } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import { EntityType } from '../../email/notifications/types'
import { sendNotificationEmail } from '../../email/notifications/sendEmail'
import {
  buildUserNotificationSettings,
  Device
} from './userNotificationSettings'

type CreateNotificationRow = Omit<NotificationRow, 'data'> & {
  data: CreateTrackNotification | CreatePlaylistNotification
}

type Track = {
  track_id: number
  title: string
  owner_id: number
}

type Playlist = {
  playlist_id: number
  playlist_name: string
  playlist_owner_id: number
}
type User = {
  user_id: number
  name: string
  is_deactivated: boolean
}

export class Create extends BaseNotification<CreateNotificationRow> {
  receiverUserIds: number[]
  trackId?: number
  playlistId?: number
  isAlbum?: boolean

  constructor(
    dnDB: Knex,
    identityDB: Knex,
    notification: CreateNotificationRow
  ) {
    super(dnDB, identityDB, notification)
    const userIds: number[] = this.notification.user_ids!
    this.receiverUserIds = userIds
    if ('track_id' in this.notification.data) {
      this.trackId = this.notification.data.track_id
    }
    if ('playlist_id' in this.notification.data) {
      this.playlistId = this.notification.data.playlist_id
      this.isAlbum = this.notification.data.is_album
    }
  }

  async pushNotification({
    isLiveEmailEnabled
  }: {
    isLiveEmailEnabled: boolean
  }) {
    let ownerId: number | undefined
    let description: string
    let track: Track | undefined
    let playlist: Playlist | undefined

    if (this.trackId) {
      const trackRes: Track[] = await this.dnDB
        .select('track_id', 'title', 'owner_id')
        .from<TrackRow>('tracks')
        .where('is_current', true)
        .whereIn('track_id', [this.trackId])
      track = trackRes[0]
      ownerId = track.owner_id
    }

    if (this.playlistId) {
      const playlistRes: Playlist[] = await this.dnDB
        .select('playlist_id', 'playlist_name', 'playlist_owner_id')
        .from<PlaylistRow>('playlists')
        .where('is_current', true)
        .whereIn('playlist_id', [this.playlistId])
      playlist = playlistRes[0]
      ownerId = playlist.playlist_owner_id
    }

    const usersRes: User[] = await this.dnDB
      .select('user_id', 'name', 'is_deactivated')
      .from<UserRow>('users')
      .where('is_current', true)
      .whereIn('user_id', [ownerId, ...this.receiverUserIds])

    const users = usersRes.reduce<
      Record<number, { name: string; isDeactivated: boolean }>
    >((acc, user) => {
      acc[user.user_id] = {
        name: user.name,
        isDeactivated: user.is_deactivated
      }
      return acc
    }, {})

    const userName = users[ownerId]?.name
    if (this.trackId) {
      description = `${userName} released a new track`
    } else {
      description = `${userName} released a new ${
        this.isAlbum ? 'album' : 'playlist'
      } ${playlist.playlist_name}`
    }

    const entityType = this.trackId
      ? 'track'
      : this.playlistId && this.isAlbum
      ? 'album'
      : this.playlistId && !this.isAlbum
      ? 'playlist'
      : null

    const entityId = this.trackId ?? this.playlistId

    const validReceiverUserIds = this.receiverUserIds.filter(
      (userId) => !(users?.[userId]?.isDeactivated ?? true)
    )
    for (const userId of validReceiverUserIds) {
      const userNotificationSettings = await buildUserNotificationSettings(
        this.identityDB,
        [userId]
      )
      // If the user has devices to the notification to, proceed
      if (
        userNotificationSettings.shouldSendPushNotification({
          initiatorUserId: ownerId,
          receiverUserId: userId
        })
      ) {
        const devices: Device[] = userNotificationSettings.getDevices(userId)
        // If the user's settings for the follow notification is set to true, proceed

        await Promise.all(
          devices.map((device) => {
            return sendPushNotification(
              {
                type: device.type,
                badgeCount: userNotificationSettings.getBadgeCount(userId) + 1,
                targetARN: device.awsARN
              },
              {
                title: 'New Artist Update',
                body: description,
                data: {
                  type: 'UserSubscription',
                  id: `timestamp:${this.getNotificationTimestamp()}:group_id:${
                    this.notification.group_id
                  }`,
                  entityType,
                  entityId,
                  entityOwnerId: ownerId
                }
              }
            )
          })
        )
        await this.incrementBadgeCount(userId)
      }

      if (
        isLiveEmailEnabled &&
        userNotificationSettings.shouldSendEmail({
          initiatorUserId: ownerId,
          receiverUserId: userId
        })
      ) {
        const notification: AppEmailNotification = {
          receiver_user_id: userId,
          ...this.notification
        }
        await sendNotificationEmail({
          userId: userId,
          userNotificationSettings,
          notifications: [notification],
          dnDb: this.dnDB,
          identityDb: this.identityDB
        })
      }
    }
  }

  getResourcesForEmail(): ResourceIds {
    const tracks = new Set<number>()
    const playlists = new Set<number>()
    if (this.trackId) {
      tracks.add(this.trackId)
    }
    if (this.playlistId) {
      playlists.add(this.playlistId)
    }
    return {
      users: new Set(this.receiverUserIds),
      tracks,
      playlists
    }
  }

  formatEmailProps(
    resources: Resources,
    additionalGroupNotifications?: Create[]
  ) {
    const count = (additionalGroupNotifications ?? []).length + 1
    let entity = {}
    let user
    if (this.trackId) {
      const track = resources.tracks[this.trackId]
      entity = {
        ...track,
        type: EntityType.Track,
        name: track.title,
        count
      }
      user = { name: track.ownerName }
    } else {
      const playlist = resources.playlists[this.playlistId]
      entity = {
        ...playlist,
        type: this.isAlbum ? EntityType.Album : EntityType.Playlist,
        name: playlist.playlist_name
      }
      user = { name: playlist.ownerName }
    }
    return {
      type: this.notification.type,
      entity: entity,
      users: [user]
    }
  }
}
