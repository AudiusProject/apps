import { useRef } from 'react'

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Animated, StyleSheet } from 'react-native'
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomTabBar, BOTTOM_BAR_HEIGHT } from 'app/components/bottom-tab-bar'
import { FULL_DRAWER_HEIGHT } from 'app/components/drawer'
import { NowPlayingDrawer } from 'app/components/now-playing-drawer'

import { useTabBarHiddenProgress } from './TabBarAutoHideContext'

type TabBarProps = BottomTabBarProps

export const AppTabBar = (props: TabBarProps) => {
  const { navigation, state } = props
  const insets = useSafeAreaInsets()
  const hidden = useTabBarHiddenProgress()
  // Set handlers for the NowPlayingDrawer and BottomTabBar
  // When the drawer is open, the bottom bar should hide (animated away).
  // When the drawer is closed, the bottom bar should reappear (animated in).
  // useRef's initializer arg is re-evaluated on every render even though the
  // value is thrown away — use lazy init to avoid allocating a discarded
  // Animated.Value on each re-render.
  const translationAnimRef = useRef<Animated.Value | null>(null)
  if (translationAnimRef.current === null) {
    translationAnimRef.current = new Animated.Value(FULL_DRAWER_HEIGHT)
  }
  const translationAnim = translationAnimRef.current

  // Drop the bar past the bottom edge as the chrome hides, clearing the safe
  // area so no sliver of glass is left floating over the home indicator.
  // Layered over the drawer's own translation rather than folded into it.
  const hideStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (BOTTOM_BAR_HEIGHT + insets.bottom) * hidden.value }
    ]
  }))

  return (
    <>
      <NowPlayingDrawer translationAnim={translationAnim} />
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
    // Out of flow so screens are full height and content scrolls behind the
    // bar. Screens clear it with `BottomChin`.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // The wrapper is a new stacking context, so restate the bar's z-order to
    // keep it above the now-playing drawer.
    zIndex: 4,
    elevation: 4
  }
})
