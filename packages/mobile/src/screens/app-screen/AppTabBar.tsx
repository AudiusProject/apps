import { useRef } from 'react'

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Animated } from 'react-native'

import { BottomTabBar } from 'app/components/bottom-tab-bar'
import { FULL_DRAWER_HEIGHT } from 'app/components/drawer'
import { NowPlayingDrawer } from 'app/components/now-playing-drawer'

type TabBarProps = BottomTabBarProps

export const AppTabBar = (props: TabBarProps) => {
  const { navigation, state } = props
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

  return (
    <>
      <NowPlayingDrawer translationAnim={translationAnim} />
      <BottomTabBar
        translationAnim={translationAnim}
        navigation={navigation}
        state={state}
      />
    </>
  )
}
