import { useEffect } from 'react'

import { Id } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { usePrevious } from 'react-use'

import { notificationFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { ID } from '~/models/Identifiers'
import { NotificationType, Notification } from '~/store/notifications/types'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeRelatedData } from '../utils/primeRelatedData'

import { useNotificationUnreadCount } from './useNotificationUnreadCount'

const DEFAULT_LIMIT = 20

type PageParam = {
  timestamp: number
  groupId: string | undefined
} | null

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
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()
  const pageSize = DEFAULT_LIMIT
  const { data: unreadCount } = useNotificationUnreadCount()
  const prevUnreadCount = usePrevious(unreadCount)

  const query = useInfiniteQuery({
    queryKey: getNotificationsQueryKey({
      currentUserId,
      pageSize
    }),
    initialPageParam: null as PageParam,
    queryFn: async ({ pageParam = null }) => {
      const sdk = await audiusSdk()
      const response = await sdk.notifications.getNotifications({
        id: Id.parse(currentUserId),
        // Requester id sent as `?user_id=` so the backend personalizes
        // embedded related.users (e.g. does_current_user_follow). The path
        // id alone identifies the notifications owner, not the requester.
        userId: Id.parse(currentUserId),
        limit: DEFAULT_LIMIT,
        timestamp: pageParam?.timestamp,
        groupId: pageParam?.groupId
      })

      primeRelatedData({ related: response.related, queryClient })

      const notifications = transformAndCleanList(
        response?.data?.notifications,
        notificationFromSDK
      ) as Notification[]

      // Keep raw pages for pagination: a page containing only retired rewards
      // must not hide later unrelated notifications.
      return notifications
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

  const notifications = (query.data?.pages.flat() ?? []).filter(
    (notification) =>
      notification.type !== NotificationType.ChallengeReward &&
      notification.type !== NotificationType.ClaimableReward &&
      notification.type !== NotificationType.ListenStreakReminder
  )

  const queryResults = query as typeof query & {
    notifications: Notification[]
  }
  queryResults.notifications = notifications

  return queryResults
}
