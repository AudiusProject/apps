import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'

import { useEnterForeground } from 'app/hooks/useAppState'

import PushNotifications from '../../notifications'

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
