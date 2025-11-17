import { useEffect, useMemo } from 'react'

import { Id } from '@audius/sdk'
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query'
import { usePrevious } from 'react-use'

import { notificationFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { useRemoteVar } from '~/hooks'
import { ChallengeRewardID } from '~/models'
import { ID } from '~/models/Identifiers'
import { StringKeys } from '~/services'
import {
  Entity,
  NotificationType,
  Notification
} from '~/store/notifications/types'

import { useCollections } from '../collection/useCollections'
import { QUERY_KEYS } from '../queryKeys'
import { useTracks } from '../tracks/useTracks'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUsers } from '../users/useUsers'

import { useNotificationUnreadCount } from './useNotificationUnreadCount'

const DEFAULT_LIMIT = 20
const USER_INITIAL_LOAD_COUNT = 9

type PageParam = {
  timestamp: number
  groupId: string | undefined
} | null

type EntityIds = {
  userIds: ID[]
  trackIds: ID[]
  collectionIds: ID[]
}

const collectEntityIds = (notifications: Notification[]): EntityIds => {
  const trackIds = new Set<ID>()
  const collectionIds = new Set<ID>()
  const userIds = new Set<ID>()

  notifications.forEach((notification) => {
    const { type } = notification
    if (type === NotificationType.UserSubscription) {
      if (notification.entityType === Entity.Track) {
        if (notification.entityIds.length === 1) {
          trackIds.add(notification.entityIds[0])
        }
      } else if (
        notification.entityType === Entity.Playlist ||
        notification.entityType === Entity.Album
      ) {
        if (notification.entityIds.length === 1) {
          collectionIds.add(notification.entityIds[0])
        }
      }
      userIds.add(notification.userId)
    }
    if (
      type === NotificationType.Repost ||
      type === NotificationType.RepostOfRepost ||
      type === NotificationType.Favorite ||
      type === NotificationType.FavoriteOfRepost ||
      (type === NotificationType.Milestone && 'entityType' in notification)
    ) {
      if (notification.entityType === Entity.Track) {
        trackIds.add(notification.entityId)
      } else if (
        notification.entityType === Entity.Playlist ||
        notification.entityType === Entity.Album
      ) {
        collectionIds.add(notification.entityId)
      } else if (notification.entityType === Entity.User) {
        userIds.add(notification.entityId)
      }
    }
    if (
      type === NotificationType.Follow ||
      type === NotificationType.Repost ||
      type === NotificationType.RepostOfRepost ||
      type === NotificationType.Favorite ||
      type === NotificationType.FavoriteOfRepost
    ) {
      notification.userIds
        .slice(0, USER_INITIAL_LOAD_COUNT)
        .forEach((id) => userIds.add(id))
    }
    if (type === NotificationType.RemixCreate) {
      trackIds.add(notification.parentTrackId).add(notification.childTrackId)
    }
    if (type === NotificationType.RemixCosign) {
      notification.entityIds.forEach((id) => trackIds.add(id))
      userIds.add(notification.parentTrackUserId)
    }
    if (
      type === NotificationType.TrendingTrack ||
      type === NotificationType.TrendingUnderground
    ) {
      trackIds.add(notification.entityId)
    }
    if (type === NotificationType.TrendingPlaylist) {
      collectionIds.add(notification.entityId)
    }
    if (
      type === NotificationType.TipSend ||
      type === NotificationType.TipReceive ||
      type === NotificationType.SupporterRankUp ||
      type === NotificationType.SupportingRankUp ||
      type === NotificationType.Reaction
    ) {
      userIds.add(notification.entityId)
    }
    if (
      type === NotificationType.AddTrackToPlaylist ||
      type === NotificationType.TrackAddedToPurchasedAlbum
    ) {
      trackIds.add(notification.trackId)
      userIds.add(notification.playlistOwnerId)
      collectionIds.add(notification.playlistId)
    }
    if (type === NotificationType.SupporterDethroned) {
      userIds.add(notification.supportedUserId).add(notification.entityId)
    }
    if (type === NotificationType.Tastemaker) {
      userIds.add(notification.userId)
      trackIds.add(notification.entityId)
    }
    if (
      type === NotificationType.USDCPurchaseBuyer ||
      type === NotificationType.USDCPurchaseSeller
    ) {
      notification.userIds.forEach((id) => userIds.add(id))
      if (notification.entityType === Entity.Track) {
        trackIds.add(notification.entityId)
      } else if (notification.entityType === Entity.Album) {
        collectionIds.add(notification.entityId)
      }
    }
    if (
      type === NotificationType.RequestManager ||
      type === NotificationType.ApproveManagerRequest
    ) {
      userIds.add(notification.userId)
    }
    if (
      type === NotificationType.Comment ||
      type === NotificationType.CommentThread ||
      type === NotificationType.CommentMention ||
      type === NotificationType.CommentReaction
    ) {
      if (notification.entityType === Entity.Track) {
        trackIds.add(notification.entityId)
      }
      notification.userIds
        .slice(0, USER_INITIAL_LOAD_COUNT)
        .forEach((id) => userIds.add(id))
    }
    if (type === NotificationType.RemixCreate) {
      trackIds.add(notification.parentTrackId)
      trackIds.add(notification.childTrackId)
    }
  })

  return {
    userIds: Array.from(userIds),
    trackIds: Array.from(trackIds),
    collectionIds: Array.from(collectionIds)
  }
}

export const getNotificationsQueryKey = ({
  currentUserId,
  pageSize
}: {
  currentUserId: ID | null | undefined
  pageSize: number
}) =>
  [
    QUERY_KEYS.notifications,
    currentUserId,
    { pageSize }
  ] as unknown as QueryKey<InfiniteData<Notification[]>>

/**
 * Hook that returns paginated notifications for the current user.
 * Uses infinite query to support "Load More" functionality.
 * Pagination is based on the timestamp and groupId of the last notification.
 */
export const useNotifications = (options?: QueryOptions) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const pageSize = DEFAULT_LIMIT
  const { data: unreadCount } = useNotificationUnreadCount()
  const prevUnreadCount = usePrevious(unreadCount)

  // Get whitelisted challenge reward IDs from remote config
  const challengeRewardIdsString = useRemoteVar(StringKeys.CHALLENGE_REWARD_IDS)
  const whitelistedChallengeIds = useMemo(() => {
    if (!challengeRewardIdsString) return new Set<ChallengeRewardID>()
    return new Set(
      challengeRewardIdsString
        .split(',')
        .map((id) => id.trim()) as ChallengeRewardID[]
    )
  }, [challengeRewardIdsString])

  const query = useInfiniteQuery({
    queryKey: getNotificationsQueryKey({
      currentUserId,
      pageSize
    }),
    initialPageParam: null as PageParam,
    queryFn: async ({ pageParam = null }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.full.notifications.getNotifications({
        userId: Id.parse(currentUserId),
        limit: DEFAULT_LIMIT,
        timestamp: pageParam?.timestamp,
        groupId: pageParam?.groupId
      })

      const notifications = transformAndCleanList(
        data?.notifications,
        notificationFromSDK
      ) as Notification[]

      // Filter out challenge reward notifications that aren't whitelisted
      return notifications.filter((notification) => {
        if (notification.type === NotificationType.ChallengeReward) {
          return whitelistedChallengeIds.has(notification.challengeId)
        }
        return true
      })
    },
    getNextPageParam: (lastPage: Notification[]) => {
      const lastNotification = lastPage[lastPage.length - 1]
      if (!lastNotification || lastPage.length < DEFAULT_LIMIT) {
        return null
      }
      return {
        timestamp: lastNotification.timestamp,
        groupId: lastNotification.groupId
      }
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })

  // Refetch when new notifications arrive
  useEffect(() => {
    if (
      prevUnreadCount !== undefined &&
      unreadCount !== undefined &&
      unreadCount > prevUnreadCount
    ) {
      // Only refetch if we're not already fetching
      if (!query.isFetching) {
        query.refetch()
      }
    }
  }, [unreadCount, prevUnreadCount, query])

  const lastPage = query.data?.pages[query.data.pages.length - 1]
  const { userIds, trackIds, collectionIds } = lastPage
    ? collectEntityIds(lastPage)
    : { userIds: undefined, trackIds: undefined, collectionIds: undefined }

  // Pre-fetch related entities
  const { isPending: isUsersPending } = useUsers(userIds)
  const { isPending: isTracksPending } = useTracks(trackIds)
  const { isPending: isCollectionsPending } = useCollections(collectionIds)

  // Return all pages except the last one if it's still loading entity data
  const notifications = query.data?.pages.slice(0, -1).flat() ?? []
  if (
    !query.isPending &&
    !isUsersPending &&
    !isTracksPending &&
    !isCollectionsPending &&
    lastPage
  ) {
    notifications.push(...lastPage)
  }

  const queryResults = query as typeof query & {
    notifications: Notification[]
    isAllPending: boolean
  }
  queryResults.notifications = notifications
  queryResults.isAllPending =
    queryResults.isPending ||
    isUsersPending ||
    isTracksPending ||
    isCollectionsPending

  return queryResults
}
