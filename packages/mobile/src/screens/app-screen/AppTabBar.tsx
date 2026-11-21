import { useRef } from 'react'

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Animated, StyleSheet } from 'react-native'
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  BottomTabBar,
  BOTTOM_BAR_HEIGHT,
  useFloatingTabBar
} from 'app/components/bottom-tab-bar'
import { FULL_DRAWER_HEIGHT } from 'app/components/drawer'
import { NowPlayingDrawer } from 'app/components/now-playing-drawer'
import { OtaUpdateBanner } from 'app/components/ota-update-banner/OtaUpdateBanner'

import { useTabBarHiddenProgress } from './TabBarAutoHideContext'

type TabBarProps = BottomTabBarProps

export const AppTabBar = (props: TabBarProps) => {
  const { navigation, state } = props
  const insets = useSafeAreaInsets()
  const hidden = useTabBarHiddenProgress()
  const floating = useFloatingTabBar()
  const translationAnimRef = useRef<Animated.Value | null>(null)
  if (translationAnimRef.current === null) {
    translationAnimRef.current = new Animated.Value(FULL_DRAWER_HEIGHT)
  }
  const translationAnim = translationAnimRef.current

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
      <NowPlayingDrawer translationAnim={translationAnim} />
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
