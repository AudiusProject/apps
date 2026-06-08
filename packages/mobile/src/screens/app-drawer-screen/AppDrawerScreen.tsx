import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { Dimensions, Platform, View, StyleSheet } from 'react-native'

import { IconAudiusLogoHorizontal } from '@audius/harmony-native'
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
  setIsAtStackRoot: (isAtStackRoot: boolean) => void
}

/**
 * The app stack after signing up or signing in
 */
const AppStack = memo(function AppStack(props: AppTabScreenProps) {
  const {
    navigation: drawerHelpers,
    gesturesDisabled,
    setGesturesDisabled,
    setIsAtStackRoot
  } = props

  const drawerNavigation = useNavigation() as any

  return (
    <AppDrawerContextProvider
      drawerNavigation={drawerNavigation}
      drawerHelpers={drawerHelpers}
      gesturesDisabled={gesturesDisabled}
      setGesturesDisabled={setGesturesDisabled}
      setIsAtStackRoot={setIsAtStackRoot}
    >
      <AppScreen />
    </AppDrawerContextProvider>
  )
})

export const AppDrawerScreen = memo(() => {
  const [gesturesDisabled, setGesturesDisabled] = useState(false)
  const [isAtStackRoot, setIsAtStackRootState] = useState(true)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const drawerHelpersRef = useRef<
    DrawerContentComponentProps['navigation'] | null
  >(null)

  const setIsAtStackRoot = useCallback((next: boolean) => {
    setIsAtStackRootState((prev) => (prev === next ? prev : next))
  }, [])

  // Drawer swipe-to-open is enabled only when at the tab stack's root, so
  // the right-swipe gesture inside a nested stack falls through to the native
  // stack's fullScreenSwipe back behavior. swipeEdgeWidth stays at the full
  // screen width so opening the drawer from the root doesn't require a swipe
  // from the screen edge.
  const drawerScreenOptions = useMemo(
    () => ({
      headerShown: false,
      swipeEdgeWidth: SCREEN_WIDTH,
      drawerType: 'slide' as const,
      drawerStyle: { width: '75%' as const },
      swipeEnabled:
        isAtStackRoot && !gesturesDisabled && !isNowPlayingDrawerOpen
    }),
    [isAtStackRoot, gesturesDisabled, isNowPlayingDrawerOpen]
  )

  // Close the left nav drawer if it's open when the now-playing drawer opens
  useEffect(() => {
    if (isNowPlayingDrawerOpen && drawerHelpersRef.current) {
      drawerHelpersRef.current.closeDrawer()
    }
  }, [isNowPlayingDrawerOpen])

  const gestureProps = {
    gesturesDisabled,
    setGesturesDisabled,
    setIsAtStackRoot
  }

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
      {/*
        iOS-only screenshot logo, positioned behind the Dynamic Island so it
        is invisible during normal use but appears in App Store screenshots
        (and on devices without a Dynamic Island). Rendered at the top of the
        component tree above the navigator so it stays put during stack
        push/pop transitions instead of fading with the leaving screen.
        pointerEvents=none lets touches pass through to the navigator below.
      */}
      {Platform.OS === 'ios' ? (
        <View pointerEvents='none' style={styles.dynamicIslandLogo}>
          <IconAudiusLogoHorizontal height={25} width={120} color='subdued' />
        </View>
      ) : null}
    </>
  )
})

const styles = StyleSheet.create({
  dynamicIslandLogo: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    opacity: 0.45
  }
})
