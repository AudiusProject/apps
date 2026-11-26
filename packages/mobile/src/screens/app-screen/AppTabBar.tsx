import { useContext, useEffect, useRef } from 'react'

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Animated, StatusBar, StyleSheet } from 'react-native'
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  BottomTabBar,
  BOTTOM_BAR_HEIGHT,
  useFloatingTabBar
} from 'app/components/bottom-tab-bar'
import { SetPlayBarVisibilityContext } from 'app/components/core/BottomBarInsetContext'
import { getFullDrawerHeight } from 'app/components/drawer'
import { useFoldLayout } from 'app/components/fold'
import { NowPlayingDrawer } from 'app/components/now-playing-drawer'
import { OtaUpdateBanner } from 'app/components/ota-update-banner/OtaUpdateBanner'
import { useDrawer } from 'app/hooks/useDrawer'

import { useTabBarHiddenProgress } from './TabBarAutoHideContext'

type TabBarProps = BottomTabBarProps

export const AppTabBar = (props: TabBarProps) => {
  const { navigation, state } = props
  const insets = useSafeAreaInsets()
  const hidden = useTabBarHiddenProgress()
  const floating = useFloatingTabBar()
  const { isWide } = useFoldLayout()
  const setPlayBarVisible = useContext(SetPlayBarVisibilityContext)
  const { isOpen: isNowPlayingOpen, onClose: closeNowPlaying } =
    useDrawer('NowPlaying')
  const translationAnimRef = useRef<Animated.Value | null>(null)
  if (translationAnimRef.current === null) {
    translationAnimRef.current = new Animated.Value(getFullDrawerHeight())
  }
  const translationAnim = translationAnimRef.current

  useEffect(() => {
    if (!isWide) return
    setPlayBarVisible(false)
    if (isNowPlayingOpen) {
      closeNowPlaying()
      StatusBar.setHidden(false, 'fade')
    }
  }, [isWide, isNowPlayingOpen, closeNowPlaying, setPlayBarVisible])

  const hideStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: floating
            ? 0
            : (BOTTOM_BAR_HEIGHT + insets.bottom) * hidden.value
        }
      ]
    }),
    [floating]
  )

  return (
    <>
      {isWide ? null : <NowPlayingDrawer translationAnim={translationAnim} />}
      <OtaUpdateBanner />
      <Reanimated.View style={[styles.bar, hideStyle]}>
        <BottomTabBar
          translationAnim={translationAnim}
          navigation={navigation}
          state={state}
        />
      </Reanimated.View>
    </>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
    elevation: 4
  }
})
