import { Knex } from 'knex'
import { NotificationRow } from '../../types/dn'
import {
  USDCPurchaseBuyerNotification,
  AppEmailNotification
} from '../../types/notifications'
import { BaseNotification } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import {
  sendNotificationEmail,
  sendTransactionalEmail
} from '../../email/notifications/sendEmail'
import {
  buildUserNotificationSettings,
  Device
} from './userNotificationSettings'
import { disableDeviceArns } from '../../utils/disableArnEndpoint'
import { capitalize } from 'lodash'
import { sendBrowserNotification } from '../../web'
import { EntityType } from '../../email/notifications/types'
import { formatUSDCWeiToUSDString } from '../../utils/format'
import { email } from '../../email/notifications/preRendered/purchase'
import { logger } from '../../logger'
import { getContentNode, getHostname } from '../../utils/env'

type USDCPurchaseBuyerRow = Omit<NotificationRow, 'data'> & {
  data: USDCPurchaseBuyerNotification
}
export class USDCPurchaseBuyer extends BaseNotification<USDCPurchaseBuyerRow> {
  notificationReceiverUserId: number
  sellerUserId: number
  amount: string
  contentId: number
  contentType: string
  extraAmount: string
  totalAmount: string

  constructor(
    dnDB: Knex,
    identityDB: Knex,
    notification: USDCPurchaseBuyerRow
  ) {
    super(dnDB, identityDB, notification)
    this.amount = formatUSDCWeiToUSDString(
      this.notification.data.amount.toString()
    )
    this.extraAmount = formatUSDCWeiToUSDString(
      this.notification.data.extra_amount.toString()
    )
    this.totalAmount = formatUSDCWeiToUSDString(
      (
        this.notification.data.amount + this.notification.data.extra_amount
      ).toString()
    )
    this.sellerUserId = this.notification.data.seller_user_id
    this.notificationReceiverUserId = this.notification.data.buyer_user_id
    this.contentId = this.notification.data.content_id
    this.contentType = this.notification.data.content_type
  }

  async processNotification({
    isLiveEmailEnabled,
    isBrowserPushEnabled
  }: {
    isLiveEmailEnabled: boolean
    isBrowserPushEnabled: boolean
  }) {
    const users = await this.getUsersBasicInfo([
      this.notificationReceiverUserId,
      this.sellerUserId
    ])
    if (users?.[this.notificationReceiverUserId]?.is_deactivated) {
      return
    }
    // Get the user's notification setting from identity service
    const userNotificationSettings = await buildUserNotificationSettings(
      this.identityDB,
      [this.notificationReceiverUserId, this.sellerUserId]
    )

    let purchasedContentName, cover_art_sizes, slug
    if (this.contentType === 'track') {
      const tracks = await this.fetchEntities(
        [this.contentId],
        EntityType.Track
      )
      const track = tracks[this.contentId]
      if (!('title' in track)) {
        logger.error(`Missing title in track ${track}`)
        return
      }
      purchasedContentName = track.title
      cover_art_sizes = track.cover_art_sizes
      slug = track.slug
    } else {
      const albums = await this.fetchEntities(
        [this.contentId],
        EntityType.Album
      )
      const album = albums[this.contentId]
      if (!('playlist_name' in album)) {
        logger.error(`Missing title in album ${album}`)
        return
      }
      purchasedContentName = album.playlist_name
      cover_art_sizes = album.playlist_image_sizes_multihash
      slug = album.slug
    }

    const sellerUsername = users[this.sellerUserId]?.name
    const sellerHandle = users[this.sellerUserId]?.handle
    const purchaserUsername = users[this.notificationReceiverUserId]?.name

    const title = 'Purchase Successful'
    const body = `You just purchased ${purchasedContentName} from ${capitalize(
      sellerUsername
    )}!`
    await sendBrowserNotification(
      isBrowserPushEnabled,
      userNotificationSettings,
      this.notificationReceiverUserId,
      title,
      body
    )
    // If the user has devices to the notification to, proceed
    if (
      userNotificationSettings.shouldSendPushNotification({
        receiverUserId: this.notificationReceiverUserId,
        initiatorUserId: this.sellerUserId
      })
    ) {
      const devices: Device[] = userNotificationSettings.getDevices(
        this.notificationReceiverUserId
      )
      const pushes = await Promise.all(
        devices.map((device) => {
          return sendPushNotification(
            {
              type: device.type,
              badgeCount:
                userNotificationSettings.getBadgeCount(
                  this.notificationReceiverUserId
                ) + 1,
              targetARN: device.awsARN
            },
            {
              title,
              body,
              data: {
                id: `timestamp:${this.getNotificationTimestamp()}:group_id:${
                  this.notification.group_id
                }`,
                type: 'USDCPurchaseBuyer',
                entityId: this.contentId
              }
            }
          )
        })
      )
      await disableDeviceArns(this.identityDB, pushes)
      await this.incrementBadgeCount(this.notificationReceiverUserId)
    }

    if (
      isLiveEmailEnabled &&
      userNotificationSettings.shouldSendEmailAtFrequency({
        initiatorUserId: this.sellerUserId,
        receiverUserId: this.notificationReceiverUserId,
        frequency: 'live'
      })
    ) {
      const notification: AppEmailNotification = {
        receiver_user_id: this.notificationReceiverUserId,
        ...this.notification
      }
      await sendNotificationEmail({
        userId: this.notificationReceiverUserId,
        email: userNotificationSettings.getUserEmail(
          this.notificationReceiverUserId
        ),
        frequency: 'live',
        notifications: [notification],
        dnDb: this.dnDB,
        identityDb: this.identityDB
      })
    }

    await sendTransactionalEmail({
      email: userNotificationSettings.getUserEmail(
        this.notificationReceiverUserId
      ),
      html: email({
        purchaserName: purchaserUsername,
        artistName: sellerUsername,
        contentTitle: purchasedContentName,
        contentLink: `${getHostname()}/${sellerHandle}/${slug}`,
        contentImage: `${getContentNode()}/content/${cover_art_sizes}/480x480.jpg`,
        price: this.amount,
        payExtra: this.extraAmount,
        total: this.totalAmount
      }),
      subject: 'Thank You For Your Support'
    })
  }

  getResourcesForEmail(): ResourceIds {
    const tracks = new Set<number>()
    const albums = new Set<number>()
    if (this.contentType === 'track') {
      tracks.add(this.contentId)
    } else {
      albums.add(this.contentId)
    }
    return {
      users: new Set([this.notificationReceiverUserId, this.sellerUserId]),
      tracks,
      playlists: albums
    }
  }

  formatEmailProps(resources: Resources) {
    const user = resources.users[this.sellerUserId]
    const track = resources.tracks[this.contentId]
    const album = resources.playlists[this.contentId]
    const isTrack = this.contentType === 'track'
    const entity = {
      type: isTrack ? EntityType.Track : EntityType.Album,
      name: isTrack ? track.title : album.playlist_name,
      imageUrl: isTrack ? track.imageUrl : album.imageUrl
    }
    return {
      type: this.notification.type,
      users: [user],
      amount: this.amount,
      entity
    }
  }
}
