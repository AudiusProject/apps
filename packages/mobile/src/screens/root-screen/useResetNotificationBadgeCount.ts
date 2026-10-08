import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'

import { useEnterForeground } from 'app/hooks/useAppState'

import PushNotifications from '../../notifications'

// The server-side badge count is reset by the notifications service when
// notifications are marked seen, so only the local badge is cleared here.
export const useResetNotificationBadgeCount = () => {
  const { data: currentUserId } = useCurrentUserId()

  useEnterForeground(
    useCallback(() => {
      if (currentUserId) {
        PushNotifications.setBadgeCount(0)
      }
    }, [currentUserId])
  )
}
