import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { useRemoteVar } from '~/hooks/useRemoteVar'
import { ID } from '~/models/Identifiers'

import { IntKeys } from '../../../services/remote-config'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export const getNotificationUnreadCountQueryKey = (
  currentUserId: ID | null | undefined
) =>
  [
    QUERY_KEYS.notificationUnreadCount,
    currentUserId
  ] as unknown as QueryKey<number>

/**
 * Hook that returns the number of unread notifications for the current user.
 * Uses the notifications endpoint with limit 0 to just get the count.
 * Polls based on the NOTIFICATION_POLLING_FREQ_MS remote config value.
 */
export const useNotificationUnreadCount = () => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const pollingFreqMs = useRemoteVar(IntKeys.NOTIFICATION_POLLING_FREQ_MS)

  const query = useQuery({
    queryKey: getNotificationUnreadCountQueryKey(currentUserId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const response = await (sdk.notifications as {
        getNotifications: (params: { userId: string; limit?: number }) => Promise<{
          data?: { unreadCount?: number }
        }>
      }).getNotifications({
        userId: Id.parse(currentUserId),
        limit: 0
      })
      return response?.data?.unreadCount ?? 0
    },
    refetchInterval: pollingFreqMs,
    enabled: !!currentUserId
  })

  return query
}
