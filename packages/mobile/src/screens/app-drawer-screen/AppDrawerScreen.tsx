import { memo, useEffect, useMemo, useRef, useState } from 'react'

import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { Dimensions } from 'react-native'

import { AudioPlayer } from 'app/components/audio/AudioPlayer'
import { RepeatListener } from 'app/components/audio/RepeatListener'
import { useDrawer } from 'app/hooks/useDrawer'

import { AppScreen } from '../app-screen'

import { AppDrawerContextProvider } from './AppDrawerContext'
import { LeftNavDrawer } from './left-nav-drawer'

const SCREEN_WIDTH = Dimensions.get('window').width

const Drawer = createDrawerNavigator()

type AppTabScreenProps = {
  navigation: DrawerContentComponentProps['navigation']
  gesturesDisabled: boolean
  setGesturesDisabled: (gesturesDisabled: boolean) => void
}

/**
 * The app stack after signing up or signing in
 */
const AppStack = memo(function AppStack(props: AppTabScreenProps) {
  const {
    navigation: drawerHelpers,
    gesturesDisabled,
    setGesturesDisabled
  } = props

  const drawerNavigation = useNavigation() as any

  return (
    <AppDrawerContextProvider
      drawerNavigation={drawerNavigation}
      drawerHelpers={drawerHelpers}
      gesturesDisabled={gesturesDisabled}
      setGesturesDisabled={setGesturesDisabled}
    >
      <AppScreen />
    </AppDrawerContextProvider>
  )
})

export const AppDrawerScreen = memo(() => {
  const [gesturesDisabled, setGesturesDisabled] = useState(false)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const drawerHelpersRef = useRef<
    DrawerContentComponentProps['navigation'] | null
  >(null)

  const drawerScreenOptions = useMemo(
    () => ({
      headerShown: false,
      swipeEdgeWidth: SCREEN_WIDTH,
      drawerType: 'slide' as const,
      drawerStyle: { width: '75%' as const },
      swipeEnabled: !gesturesDisabled && !isNowPlayingDrawerOpen,
      gestureHandlerProps: {
        enabled: !gesturesDisabled && !isNowPlayingDrawerOpen
      }
    }),
    [gesturesDisabled, isNowPlayingDrawerOpen]
  )

  // Close the left nav drawer if it's open when the now-playing drawer opens
  useEffect(() => {
    if (isNowPlayingDrawerOpen && drawerHelpersRef.current) {
      drawerHelpersRef.current.closeDrawer()
    }
  }, [isNowPlayingDrawerOpen])

  const gestureProps = { gesturesDisabled, setGesturesDisabled }

  return (
    <>
      <RepeatListener />
      <AudioPlayer />
      <Drawer.Navigator
        screenOptions={drawerScreenOptions}
        defaultStatus='closed'
        drawerContent={(props) => {
          // Store drawer helpers in ref so we can close the drawer when needed
          drawerHelpersRef.current = props.navigation
          return <LeftNavDrawer {...gestureProps} {...props} />
        }}
      >
        <Drawer.Screen name='App'>
          {(props) => <AppStack {...props} {...gestureProps} />}
        </Drawer.Screen>
      </Drawer.Navigator>
    </>
  )
})
