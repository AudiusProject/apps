import moment from 'moment-timezone'

import { logger } from '../../logger'

// @ts-ignore
import { DMEntityType } from './types'
import { AppEmailNotification, DMEmailNotification, EmailNotification } from '../../types/notifications'
import { renderNotificationsEmail } from './components/index'
import { EmailFrequency } from '../../processNotifications/mappers/base'
import { Knex } from 'knex'
import { EntityType } from './types'
import { mapNotifications } from '../../processNotifications/mappers/mapNotifications'
import { BaseNotification } from '../../processNotifications/mappers/base'
import { CosignRemixNotification, CreatePlaylistNotification, CreateTrackNotification, FollowerMilestoneNotification, PlaylistMilestoneNotification, RemixNotification, RepostNotification, SaveNotification, SupporterRankUpNotification, SupportingRankUpNotification, TierChangeNotification, TipReceiveNotification, TipSendNotification, TrackMilestoneNotification } from '../../types/notifications'

type RenderEmailProps = {
  userId: number
  email: string
  notifications: EmailNotification[]
  frequency: EmailFrequency
  dnDb: Knex
  identityDb: Knex
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

type UserResourcesDict = { [userId: number]: UserResource & { imageUrl: string, twitterHandle?: string, instagramHandle?: string, tikTokHandle?: string } }
type TrackResourcesDict = { [userId: number]: TrackResource & { imageUrl: string } }
type PlaylistResourcesDict = { [userId: number]: PlaylistResource & { imageUrl: string } }
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
  const contentNodes = user.creator_node_endpoint.split(',')
  const primaryEndpoint = contentNodes[0]
  let profilePictureUrl = DEFAULT_PROFILE_IMG
  if (user.profile_picture_sizes) {
    profilePictureUrl = `${primaryEndpoint}/ipfs/${user.profile_picture_sizes}/1000x1000.jpg`
  } else if (user.profile_picture) {
    profilePictureUrl = `${primaryEndpoint}/ipfs/${user.profile_picture}`
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

const fetchResources = async (dnDb: Knex, identityDb: Knex, ids: ResourceIds): Promise<Resources> => {
  const userRows: UserResource[] = await dnDb.select(
    'users.user_id',
    'users.handle',
    'users.name',
    'users.profile_picture_sizes',
    'users.profile_picture',
    'users.creator_node_endpoint',
  ).from('users').whereIn('user_id', Array.from(ids.users)).andWhere('is_current', true)

  const userHandles = userRows.map(row => row.handle)
  const identityUserRows = await identityDb.select(
    'handle',
    'twitterHandle',
    'instagramHandle',
    'tikTokHandle',
  ).from("SocialHandles").whereIn('handle', userHandles)
  const userSocialHandles = identityUserRows.reduce((acc, user) => {
    acc[user.handle] = user
    return acc
  }, {} as { [handle: string]: { twitterHandle: string, instagramHandle: string, tikTokHandle: string } })

  const users = userRows.reduce((acc, user) => {
    const userSocial = userSocialHandles[user.handle] || {}
    acc[user.user_id] = {
      ...userSocial,
      ...user,
      imageUrl: getUserProfileUrl(user)
    }
    return acc
  }, {} as { [userId: number]: UserResource & { imageUrl: string } })


  const trackRows: TrackResource[] = await dnDb.select(
    'tracks.track_id',
    'tracks.title',
    'tracks.owner_id',
    'tracks.cover_art_sizes',
    { ownerName: 'users.name' },
    'users.creator_node_endpoint',
    'track_routes.slug'
  ).from('tracks')
    .join('users', 'users.user_id', 'tracks.owner_id')
    .join('track_routes', 'track_routes.track_id', 'tracks.track_id')
    .whereIn('tracks.track_id', Array.from(ids.tracks))
    .andWhere('tracks.is_current', true)
    .andWhere('users.is_current', true)
    .andWhere('track_routes.is_current', true)
  const tracks = trackRows.reduce((acc, track) => {
    acc[track.track_id] = {
      ...track,
      imageUrl: getTrackCoverArt(track)
    }
    return acc
  }, {} as { [trackId: number]: TrackResource & { imageUrl: string } })

  const playlistRows: PlaylistResource[] = await dnDb.select(
    'playlists.playlist_id',
    'playlists.playlist_name',
    'playlists.is_album',
    'playlists.playlist_image_sizes_multihash',
    'playlists.playlist_image_multihash',
    { ownerName: 'users.name' },
    'users.creator_node_endpoint',
    'playlist_routes.slug'
  ).from('playlists')
    .join('users', 'users.user_id', 'playlists.playlist_owner_id')
    .join('playlist_routes', 'playlist_routes.playlist_id', 'playlists.playlist_id')
    .whereIn('playlists.playlist_id', Array.from(ids.playlists))
    .andWhere('playlists.is_current', true)
    .andWhere('users.is_current', true)
    .andWhere('playlist_routes.is_current', true)

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
const getNotificationProps = async (dnDB: Knex, identityDB: Knex, notifications: EmailNotification[], additionalNotifications: { [id: string]: AppEmailNotification[] }) => {
  const idsToFetch: ResourceIds = {
    users: new Set(),
    tracks: new Set(),
    playlists: new Set(),
  }


  const mappedNotifications: BaseNotification<any>[] = mapNotifications(notifications, dnDB, identityDB)
  for (const notification of mappedNotifications) {
    const resourcesToFetch = notification.getResourcesForEmail()
    Object.entries(resourcesToFetch).forEach(([key, value]) => {
      (value as Set<number>).forEach(idsToFetch[key as keyof ResourceIds].add, idsToFetch[key as keyof ResourceIds])
    })
  }
  const mappedAdditionalNotifications: { [id: string]: BaseNotification<any>[] } = Object.keys(additionalNotifications).reduce((acc, n) => {
    if (additionalNotifications[n].length > 0) {
      acc[n] = mapNotifications(additionalNotifications[n], dnDB, identityDB)
      for (const notification of acc[n]) {
        const resourcesToFetch = notification.getResourcesForEmail()
        Object.entries(resourcesToFetch).forEach(([key, value]) => {
          (value as Set<number>).forEach(idsToFetch[key as keyof ResourceIds].add, idsToFetch[key as keyof ResourceIds])
        })
      }
    }
    return acc
  }, {})

  const resources = await fetchResources(dnDB, identityDB, idsToFetch)
  return mappedNotifications.map(n => n.formatEmailProps(resources, mappedAdditionalNotifications[n?.notification?.group_id]))
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

const getEmailSubject = (frequency: EmailFrequency, notificationCount: number) => {
  const now = moment()
  const dayAgo = now.clone().subtract(1, 'days')
  const weekAgo = now.clone().subtract(7, 'days')
  const formattedDayAgo = dayAgo.format('MMMM Do YYYY')
  const shortWeekAgoFormat = weekAgo.format('MMMM Do')
  const liveSubjectFormat = `${notificationCount} unread notification${notificationCount > 1 ? 's' : ''
    }`
  const weeklySubjectFormat = `${notificationCount} unread notification${notificationCount > 1 ? 's' : ''
    } from ${shortWeekAgoFormat} - ${formattedDayAgo}`
  const dailySubjectFormat = `${notificationCount} unread notification${notificationCount > 1 ? 's' : ''
    } from ${formattedDayAgo}`

  let subject
  if (frequency === 'live') {
    subject = liveSubjectFormat
  } if (frequency === 'daily') {
    subject = dailySubjectFormat
  } else {
    subject = weeklySubjectFormat
  }
  return subject
}

// Set of notifications that we do NOT send out emails for
// NOTE: This is to match parity with what identity does  
const notificationsWithoutEmail = new Set(['supporter_dethroned', 'tier_change', 'tip_send'])

// Master function to render and send email for a given userId
export const renderEmail = async ({
  userId,
  email,
  frequency,
  notifications,
  dnDb,
  identityDb,
}: RenderEmailProps) => {
  logger.debug(
    `renderAndSendNotificationEmail | ${userId}, ${email}, ${frequency}`
  )

  const validNotifications = notifications.filter(n => !notificationsWithoutEmail.has(n.type))
  const notificationCount = validNotifications.length
  // Get first 5 distinct notifications
  const notificationsToSend: EmailNotification[] = []
  const groupedNotifications: { [id: string]: AppEmailNotification[] } = {}
  for (let notification of validNotifications) {
    const isAleadyIncluded = notificationsToSend.some(n => 'group_id' in notification && 'group_id' in n && n?.group_id === notification?.group_id)
    if (notificationsToSend.length <= 5 && !isAleadyIncluded) {
      notificationsToSend.push(notification)
    } else if ('group_id' in notification) {
      if (isAleadyIncluded) {
        groupedNotifications[notification?.group_id] = (groupedNotifications[notification?.group_id] || [])
        groupedNotifications[notification?.group_id].push(notification)
      }
    }
  }
  const notificationProps = await getNotificationProps(dnDb, identityDb, notificationsToSend, groupedNotifications)
  const renderProps = {
    copyrightYear: new Date().getFullYear().toString(),
    notifications: notificationProps,
    title: getEmailTitle(frequency, email),
    subject: getEmailSubject(frequency, notificationCount)
  }

  const notifHtml = renderNotificationsEmail(renderProps)
  return notifHtml

}
