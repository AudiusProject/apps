import { Id } from '@audius/sdk/services'
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
      // Optimistically set unread count to 0
      queryClient.setQueryData(
        getNotificationUnreadCountQueryKey(currentUserId),
        0
      )
    }
  })
}
