import { useCallback } from 'react'

import { useMarkNotificationsAsViewed } from '@audius/common/api'
import { useFocusEffect } from '@react-navigation/native'

import { Screen, ScreenContent } from 'app/components/core'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'

import { NotificationList } from './NotificationList'

const messages = {
  header: 'Notifications'
}

export const NotificationsScreen = () => {
  useAppTabScreen()
  const { mutate: markAsViewed } = useMarkNotificationsAsViewed()

  const handleMarkAsViewed = useCallback(() => {
    markAsViewed()
  }, [markAsViewed])

  useFocusEffect(handleMarkAsViewed)

  return (
    <Screen
      header={() => <MobileRootHeader title={messages.header} />}
    >
      <ScreenContent>
        <ScreenSecondaryContent>
          <NotificationList />
        </ScreenSecondaryContent>
      </ScreenContent>
    </Screen>
  )
}
