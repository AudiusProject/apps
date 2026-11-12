import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import {
  getNotificationUnreadCountQueryKey,
  useNotificationUnreadCount
} from './useNotificationUnreadCount'

/**
 * Hook to mark all notifications as viewed
 */
export const useMarkNotificationsAsViewed = () => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const { data: unreadCount } = useNotificationUnreadCount()

  return useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error('User ID is required')
      if (unreadCount === 0) return
      const sdk = await audiusSdk()
      await sdk.notifications.markAllNotificationsAsViewed({
        userId: Id.parse(currentUserId)
      })
    },
    onMutate: () => {
      const queryKey = getNotificationUnreadCountQueryKey(currentUserId)
      const previousUnreadCount = queryClient.getQueryData(queryKey)
      // Optimistically set unread count to 0
      queryClient.setQueryData(queryKey, 0)
      return { previousUnreadCount }
    },
    onError: (_error, _variables, context) => {
      // Roll back the optimistic update so the unread badge isn't lost
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(
          getNotificationUnreadCountQueryKey(currentUserId),
          context.previousUnreadCount
        )
      }
    }
  })
}
