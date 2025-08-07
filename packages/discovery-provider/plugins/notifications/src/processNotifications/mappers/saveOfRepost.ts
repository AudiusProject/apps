import { Knex } from 'knex'
import { NotificationRow, PlaylistRow, TrackRow, UserRow } from '../../types/dn'
import {
  AppEmailNotification,
  SaveOfRepostNotification
} from '../../types/notifications'
import { BaseNotification } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import { EntityType } from '../../email/notifications/types'
import { sendNotificationEmail } from '../../email/notifications/sendEmail'
import { capitalize } from 'lodash'
import {
  buildUserNotificationSettings,
  Device
} from './userNotificationSettings'
import { sendBrowserNotification } from '../../web'
import { disableDeviceArns } from '../../utils/disableArnEndpoint'
import { formatImageUrl } from '../../utils/format'

type SaveOfRepostNotificationRow = Omit<NotificationRow, 'data'> & {
  data: SaveOfRepostNotification
}
export class SaveOfRepost extends BaseNotification<SaveOfRepostNotificationRow> {
  receiverUserId: number
  saveOfRepostItemId: number
  saveOfreposttype: EntityType
  saveOfRepostUserId: number

  constructor(
    dnDB: Knex,
    identityDB: Knex,
    notification: SaveOfRepostNotificationRow
  ) {
    super(dnDB, identityDB, notification)
    const userIds: number[] = this.notification.user_ids!
    this.receiverUserId = userIds[0]
    this.saveOfRepostItemId = this.notification.data.save_of_repost_item_id
    this.saveOfreposttype = this.notification.data.type
    this.saveOfRepostUserId = this.notification.data.user_id
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
      .whereIn('user_id', [this.receiverUserId, this.saveOfRepostUserId])
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

    const userNotificationSettings = await buildUserNotificationSettings(
      this.identityDB,
      [this.receiverUserId, this.saveOfRepostUserId]
    )
    const saveOfRepostUserName = users[this.saveOfRepostUserId]?.name
    let entityType
    let entityName
    let imageUrl: string | undefined
    const entityId = this.saveOfRepostItemId

    if (this.saveOfreposttype === EntityType.Track) {
      const res: Array<{
        track_id: number
        title: string
        cover_art_sizes?: string | null
      }> = await this.dnDB
        .select('track_id', 'title', 'cover_art_sizes')
        .from<TrackRow>('tracks')
        .where('is_current', true)
        .whereIn('track_id', [this.saveOfRepostItemId])
      const tracks = res.reduce((acc, track) => {
        acc[track.track_id] = {
          title: track.title,
          cover_art_sizes: track.cover_art_sizes
        }
        return acc
      }, {} as Record<number, { title: string; cover_art_sizes?: string | null }>)

      entityType = EntityType.Track
      entityName = tracks[this.saveOfRepostItemId]?.title

      // Generate image URL for track cover art
      if (tracks[this.saveOfRepostItemId]?.cover_art_sizes) {
        imageUrl = formatImageUrl(
          tracks[this.saveOfRepostItemId].cover_art_sizes!,
          150
        )
      }
    } else {
      const res: Array<{
        playlist_id: number
        playlist_name: string
        is_album: boolean
        playlist_image_sizes_multihash?: string | null
      }> = await this.dnDB
        .select(
          'playlist_id',
          'playlist_name',
          'is_album',
          'playlist_image_sizes_multihash'
        )
        .from<PlaylistRow>('playlists')
        .where('is_current', true)
        .whereIn('playlist_id', [this.saveOfRepostItemId])
      const playlists = res.reduce((acc, playlist) => {
        acc[playlist.playlist_id] = {
          playlist_name: playlist.playlist_name,
          is_album: playlist.is_album,
          playlist_image_sizes_multihash:
            playlist.playlist_image_sizes_multihash
        }
        return acc
      }, {} as Record<number, { playlist_name: string; is_album: boolean; playlist_image_sizes_multihash?: string | null }>)
      const playlist = playlists[this.saveOfRepostItemId]
      entityType = playlist?.is_album ? EntityType.Album : EntityType.Playlist
      entityName = playlist?.playlist_name

      // Generate image URL for playlist/album artwork
      if (playlist?.playlist_image_sizes_multihash) {
        imageUrl = formatImageUrl(playlist.playlist_image_sizes_multihash, 150)
      }
    }

    const title = 'New Favorite'
    const body = `${saveOfRepostUserName} favorited your repost of ${entityName}`
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
        initiatorUserId: this.saveOfRepostUserId,
        receiverUserId: this.receiverUserId
      }) &&
      userNotificationSettings.isNotificationTypeEnabled(
        this.receiverUserId,
        'favorites'
      )
    ) {
      const devices: Device[] = userNotificationSettings.getDevices(
        this.receiverUserId
      )
      // If the user's settings for the reposts notification is set to true, proceed
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
                userIds: [this.saveOfRepostUserId],
                type: 'FavoriteOfRepost',
                entityId,
                entityType: capitalize(entityType)
              },
              imageUrl
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
        initiatorUserId: this.saveOfRepostUserId,
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
    const tracks = new Set<number>()
    const playlists = new Set<number>()
    if (this.saveOfreposttype === EntityType.Track) {
      tracks.add(this.saveOfRepostItemId)
    } else {
      playlists.add(this.saveOfRepostItemId)
    }

    return {
      users: new Set([this.receiverUserId, this.saveOfRepostUserId]),
      tracks,
      playlists
    }
  }

  formatEmailProps(resources: Resources) {
    const user = resources.users[this.saveOfRepostUserId]
    let entity
    if (this.saveOfreposttype === EntityType.Track) {
      const track = resources.tracks[this.saveOfRepostItemId]
      entity = {
        type: EntityType.Track,
        name: track.title,
        imageUrl: track.imageUrl
      }
    } else {
      const playlist = resources.playlists[this.saveOfRepostItemId]
      entity = {
        type: playlist.is_album ? EntityType.Album : EntityType.Playlist,
        name: playlist.playlist_name,
        imageUrl: playlist.imageUrl
      }
    }
    return {
      type: this.notification.type,
      users: [user],
      entity
    }
  }
}
