import type { ReactNode } from 'react'
import { useEffect, useMemo, createContext, useState } from 'react'

import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useInterval } from 'react-use'

import { navigationRef } from 'app/components/navigation-container/NavigationContainer'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'
import PushNotifications from 'app/notifications'

import type { AppTabScreenParamList } from './AppTabScreen'

export type AppTabNavigation = NativeStackNavigationProp<AppTabScreenParamList>

type AppTabNavigationContextValue = {
  navigation: AppTabNavigation
}

export const AppTabNavigationContext =
  createContext<AppTabNavigationContextValue>({
    navigation: {} as AppTabNavigation
  })

type SetAppTabNavigationContextValue = {
  setNavigation: (navigation: AppTabNavigation) => void
}

export const SetAppTabNavigationContext =
  createContext<SetAppTabNavigationContextValue>({
    setNavigation: () => {}
  })

type AppTabNavigationProviderProps = { children: ReactNode }

const checkNavReadyInterval = 1000

export const AppTabNavigationProvider = (
  props: AppTabNavigationProviderProps
) => {
  const { children } = props
  const [navigation, setNavigation] = useState({} as AppTabNavigation)
  const notifNavigation = useNotificationNavigation()
  const [isNavigationReady, setIsNavigationReady] = useState(false)

  const navigationContext = useMemo(
    () => ({ navigation, setNavigation }),
    [navigation, setNavigation]
  )

  const setNavigationContext = useMemo(
    () => ({ setNavigation }),
    [setNavigation]
  )

  useEffect(() => {
    PushNotifications.setNavigation(notifNavigation)
  }, [notifNavigation])

  useInterval(
    () => {
      if (navigationRef.isReady()) {
        PushNotifications.openInitialNotification()
        setIsNavigationReady(true)
      }
    },
    isNavigationReady ? null : checkNavReadyInterval
  )

  return (
    <AppTabNavigationContext.Provider value={navigationContext}>
      <SetAppTabNavigationContext.Provider value={setNavigationContext}>
        {children}
      </SetAppTabNavigationContext.Provider>
    </AppTabNavigationContext.Provider>
  )
}
