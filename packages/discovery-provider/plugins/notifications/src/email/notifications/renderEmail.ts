import moment from 'moment-timezone'

import { logger } from '../../logger'

import {
  AppEmailNotification,
  EmailNotification
} from '../../types/notifications'
import { renderNotificationsEmail } from './components/index'
import { Knex } from 'knex'
import { mapNotifications } from '../../processNotifications/mappers/mapNotifications'
import { BaseNotification } from '../../processNotifications/mappers/base'
import { EmailFrequency } from '../../processNotifications/mappers/userNotificationSettings'
import { getContentNode } from '../../utils/env'

type RenderEmailProps = {
  userId: number
  email: string
  notifications: EmailNotification[]
  frequency: EmailFrequency
  dnDb: Knex
  identityDb: Knex
  timezone?: string
}

export type ResourceIds = {
  users?: Set<number>
  tracks?: Set<number>
  playlists?: Set<number>
}

type UserResource = {
  user_id: number
  name: string
  handle: string
  profile_picture_sizes: string
  profile_picture: string
  creator_node_endpoint: string
}
type TrackResource = {
  track_id: number
  title: string
  owner_id: number
  cover_art: string
  cover_art_sizes: string
  stream_conditions: object
  creator_node_endpoint: string
  slug: string
  ownerName: string
  ownerCreatorNodeEndpoint: string
}
type PlaylistResource = {
  playlist_id: number
  playlist_name: string
  is_album: boolean
  playlist_image_multihash: string
  playlist_image_sizes_multihash: string
  creator_node_endpoint: string
  slug: string
  ownerName: string
  ownerCreatorNodeEndpoint: string
}

type UserResourcesDict = {
  [userId: number]: UserResource & {
    imageUrl: string
    twitterHandle?: string
    instagramHandle?: string
    tikTokHandle?: string
  }
}
type TrackResourcesDict = {
  [userId: number]: TrackResource & { imageUrl: string }
}
type PlaylistResourcesDict = {
  [userId: number]: PlaylistResource & { imageUrl: string }
}
export type Resources = {
  users: UserResourcesDict
  tracks: TrackResourcesDict
  playlists: PlaylistResourcesDict
}

// TODO: Fill out defaults
const DEFAULT_PROFILE_IMG = ''
const DEFAULT_TRACK_COVER_ART_URL = ''
const DEFAULT_PLAYLIST_IMAGE_IRL = ''

const getUserProfileUrl = (user: UserResource) => {
  let profilePictureUrl = DEFAULT_PROFILE_IMG
  const contentNode = getContentNode()
  if (user.profile_picture_sizes) {
    profilePictureUrl = `${contentNode}/content/${user.profile_picture_sizes}/1000x1000.jpg`
  } else if (user.profile_picture) {
    profilePictureUrl = `${contentNode}/content/${user.profile_picture}`
  }
  return profilePictureUrl
}

const getTrackCoverArt = (track: TrackResource) => {
  const contentNodes = track.creator_node_endpoint.split(',')
  const primaryEndpoint = contentNodes[0]
  let coverArtUrl = DEFAULT_TRACK_COVER_ART_URL
  if (track.cover_art_sizes) {
    coverArtUrl = `${primaryEndpoint}/ipfs/${track.cover_art_sizes}/1000x1000.jpg`
  } else if (track.cover_art) {
    coverArtUrl = `${primaryEndpoint}/ipfs/${track.cover_art}`
  }
  return coverArtUrl
}

const getPlaylistImage = (playlist: PlaylistResource) => {
  const contentNodes = playlist.creator_node_endpoint.split(',')
  const primaryEndpoint = contentNodes[0]
  let playlistImageUrl = DEFAULT_PLAYLIST_IMAGE_IRL
  if (playlist.playlist_image_sizes_multihash) {
    playlistImageUrl = `${primaryEndpoint}/ipfs/${playlist.playlist_image_sizes_multihash}/1000x1000.jpg`
  } else if (playlist.playlist_image_multihash) {
    playlistImageUrl = `${primaryEndpoint}/ipfs/${playlist.playlist_image_multihash}`
  }
  return playlistImageUrl
}

const BATCH_SIZE = 100

function* inBatches<T>(arr: Iterable<T>, size: number): Generator<T[]> {
  let batch: T[] = []
  for (const item of arr) {
    batch.push(item)
    if (batch.length >= size) {
      yield batch
      batch = []
    }
  }
  if (batch.length > 0) yield batch
}

export const fetchResources = async (
  dnDb: Knex,
  identityDb: Knex,
  ids: ResourceIds
): Promise<Resources> => {
  const userRows: UserResource[] = []
  for (const batch of inBatches(ids.users ?? [], BATCH_SIZE)) {
    const rows = await dnDb
      .select(
        'users.user_id',
        'users.handle',
        'users.twitter_handle as twitterHandle',
        'users.instagram_handle as instagramHandle',
        'users.tiktok_handle as tikTokHandle',
        'users.name',
        'users.profile_picture_sizes',
        'users.profile_picture',
        'users.creator_node_endpoint'
      )
      .from('users')
      .whereIn('user_id', batch)
      .andWhere('is_current', true)
    userRows.push(...rows)
  }

  const users = userRows.reduce((acc, user) => {
    acc[user.user_id] = {
      ...user,
      imageUrl: getUserProfileUrl(user)
    }
    return acc
  }, {} as { [userId: number]: UserResource & { imageUrl: string } })

  const trackRows: TrackResource[] = []
  const trackIds = Array.from(ids.tracks ?? [])
  for (const batch of inBatches(trackIds, BATCH_SIZE)) {
    const rows = await dnDb
      .select(
        'tracks.track_id',
        'tracks.title',
        'tracks.owner_id',
        'tracks.cover_art_sizes',
        'tracks.stream_conditions',
        { ownerName: 'users.name' },
        'users.creator_node_endpoint',
        'track_routes.slug'
      )
      .from('tracks')
      .join('users', 'users.user_id', 'tracks.owner_id')
      .join('track_routes', 'track_routes.track_id', 'tracks.track_id')
      .whereIn('tracks.track_id', batch)
      .andWhere('tracks.is_current', true)
      .andWhere('users.is_current', true)
      .andWhere('track_routes.is_current', true)
    trackRows.push(...rows)
  }
  const tracks = trackRows.reduce((acc, track) => {
    acc[track.track_id] = {
      ...track,
      imageUrl: getTrackCoverArt(track)
    }
    return acc
  }, {} as { [trackId: number]: TrackResource & { imageUrl: string } })

  const playlistRows: PlaylistResource[] = []
  const playlistIds = Array.from(ids.playlists ?? [])
  for (const batch of inBatches(playlistIds, BATCH_SIZE)) {
    const rows = await dnDb
      .select(
        'playlists.playlist_id',
        'playlists.playlist_name',
        'playlists.is_album',
        'playlists.playlist_image_sizes_multihash',
        'playlists.playlist_image_multihash',
        { ownerName: 'users.name' },
        'users.creator_node_endpoint',
        'playlist_routes.slug'
      )
      .from('playlists')
      .join('users', 'users.user_id', 'playlists.playlist_owner_id')
      .join(
        'playlist_routes',
        'playlist_routes.playlist_id',
        'playlists.playlist_id'
      )
      .whereIn('playlists.playlist_id', batch)
      .andWhere('playlists.is_current', true)
      .andWhere('users.is_current', true)
      .andWhere('playlist_routes.is_current', true)
    playlistRows.push(...rows)
  }

  const playlists = playlistRows.reduce((acc, playlist) => {
    acc[playlist.playlist_id] = {
      ...playlist,
      imageUrl: getPlaylistImage(playlist)
    }
    return acc
  }, {} as { [playlistId: number]: PlaylistResource & { imageUrl: string } })

  return { users, tracks, playlists }
}

/**
 *
 * @param dnDB Discovery DB
 * @param identityDB Identity DB
 * @param notifications List of notifications to get email props for
 * @param additionalNotifications Mao of 'additional' notifications that get grouped with a notification from the 'notification' params
 * ie. if there are 5 follows for a user, they get grouped together and have the same group_id - so they should be put together to fetch
 * the correct props passed to the email render engine
 * @returns Props ready to pass into the render email method
 */
const getNotificationProps = async (
  dnDB: Knex,
  identityDB: Knex,
  notifications: EmailNotification[],
  additionalNotifications: { [id: string]: AppEmailNotification[] }
) => {
  const idsToFetch: ResourceIds = {
    users: new Set(),
    tracks: new Set(),
    playlists: new Set()
  }

  const mappedNotifications: BaseNotification<any>[] = mapNotifications(
    notifications,
    dnDB,
    identityDB
  )
  for (const notification of mappedNotifications) {
    const resourcesToFetch = notification.getResourcesForEmail()
    Object.entries(resourcesToFetch).forEach(([key, value]) => {
      ;(value as Set<number>).forEach(
        idsToFetch[key as keyof ResourceIds].add,
        idsToFetch[key as keyof ResourceIds]
      )
    })
  }
  const mappedAdditionalNotifications: {
    [id: string]: BaseNotification<any>[]
  } = Object.keys(additionalNotifications).reduce((acc, n) => {
    if (additionalNotifications[n].length > 0) {
      acc[n] = mapNotifications(additionalNotifications[n], dnDB, identityDB)
      for (const notification of acc[n]) {
        const resourcesToFetch = notification.getResourcesForEmail()
        Object.entries(resourcesToFetch).forEach(([key, value]) => {
          ;(value as Set<number>).forEach(
            idsToFetch[key as keyof ResourceIds].add,
            idsToFetch[key as keyof ResourceIds]
          )
        })
      }
    }
    return acc
  }, {})

  const resources = await fetchResources(dnDB, identityDB, idsToFetch)
  return mappedNotifications
    .map((n) =>
      n.formatEmailProps(
        resources,
        mappedAdditionalNotifications[n?.notification?.group_id]
      )
    )
    .filter(Boolean)
}

const getEmailTitle = (frequency: EmailFrequency, userEmail: string) => {
  if (frequency === 'live') {
    return `Email - ${userEmail}`
  } else if (frequency === 'daily') {
    return `Daily Email - ${userEmail}`
  } else if (frequency === 'weekly') {
    return `Weekly Email - ${userEmail}`
  }
}

const getEmailSubject = (
  frequency: EmailFrequency,
  notificationCount: number,
  timezone?: string
) => {
  const now = moment.tz(timezone)
  const weekAgo = now.clone().subtract(6, 'days')
  // Note that scheduled emails are sent
  // at midnight the following day, so the current
  // day for the user will be a day ago by the time
  // they receive the email.
  const formattedDayAgo = now.format('MMMM Do YYYY')
  const shortWeekAgoFormat = weekAgo.format('MMMM Do')
  const liveSubjectFormat = `${notificationCount} unread notification${
    notificationCount > 1 ? 's' : ''
  }`
  const weeklySubjectFormat = `${notificationCount} unread notification${
    notificationCount > 1 ? 's' : ''
  } from ${shortWeekAgoFormat} - ${formattedDayAgo}`
  const dailySubjectFormat = `${notificationCount} unread notification${
    notificationCount > 1 ? 's' : ''
  } from ${formattedDayAgo}`

  let subject
  if (frequency === 'live') {
    subject = liveSubjectFormat
  } else if (frequency === 'daily') {
    subject = dailySubjectFormat
  } else if (frequency === 'weekly') {
    subject = weeklySubjectFormat
  }
  return subject
}

// Master function to render and send email for a given userId
export const renderEmail = async ({
  userId,
  email,
  frequency,
  notifications,
  dnDb,
  identityDb,
  timezone
}: RenderEmailProps) => {
  logger.debug(
    `renderAndSendNotificationEmail | ${userId}, ${email}, ${frequency}`
  )

  const notificationCount = notifications.length

  // Get first 5 distinct notifications
  const notificationsToSend: EmailNotification[] = []
  const groupedNotifications: { [id: string]: AppEmailNotification[] } = {}
  for (const notification of notifications) {
    const isAleadyIncluded = notificationsToSend.some(
      (n) =>
        'group_id' in notification &&
        'group_id' in n &&
        n?.group_id === notification?.group_id
    )
    if (notificationsToSend.length <= 5 && !isAleadyIncluded) {
      notificationsToSend.push(notification)
    } else if ('group_id' in notification) {
      if (isAleadyIncluded) {
        groupedNotifications[notification?.group_id] =
          groupedNotifications[notification?.group_id] || []
        groupedNotifications[notification?.group_id].push(notification)
      }
    }
  }

  const notificationProps = await getNotificationProps(
    dnDb,
    identityDb,
    notificationsToSend,
    groupedNotifications
  )
  const renderProps = {
    copyrightYear: new Date().getFullYear().toString(),
    notifications: notificationProps,
    title: getEmailTitle(frequency, email),
    subject: getEmailSubject(frequency, notificationCount, timezone)
  }

  const notifHtml = renderNotificationsEmail(renderProps)
  return notifHtml
}
