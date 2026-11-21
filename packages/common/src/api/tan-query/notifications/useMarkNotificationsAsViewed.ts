import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import {
  getNotificationUnreadCountQueryKey,
  useNotificationUnreadCount
} from './useNotificationUnreadCount'

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
      queryClient.setQueryData(queryKey, 0)
      return { previousUnreadCount }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(
          getNotificationUnreadCountQueryKey(currentUserId),
          context.previousUnreadCount
        )
      }
    }
  })
}
