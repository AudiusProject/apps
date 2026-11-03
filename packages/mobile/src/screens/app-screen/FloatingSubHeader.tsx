import type { ReactNode } from 'react'
import { useCallback } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import { zIndex } from 'app/utils/zIndex'

import {
  useChromeHiddenProgress,
  useGlassHeaderInset,
  useRootHeaderHeight,
  useSetSubHeaderHeight,
  useSubHeaderHeight
} from './GlassChromeContext'
import {
  EDGE_FADE_TAIL,
  GlassEdgeFade,
  SUB_HEADER_FADE_OPACITY
} from './GlassEdgeFade'

type FloatingSubHeaderProps = {
  children: ReactNode
}

/**
 * Pins a screen's persistent top row (feed tabs, trending pills) beneath the
 * floating root header. The pills float on their own over a fade that picks
 * up where the header's leaves off, so there's no slab behind them.
 *
 * Owned by the screen rather than passed into `MobileRootHeader`, whose
 * memoized render prop must not rebuild on tab-state changes (that remounts
 * `AccountPictureHeader` and re-fires the profile-picture fetch).
 */
export const FloatingSubHeader = (props: FloatingSubHeaderProps) => {
  const { children } = props
  const headerHeight = useRootHeaderHeight()
  const subHeaderHeight = useSubHeaderHeight()
  const setSubHeaderHeight = useSetSubHeaderHeight()
  const hidden = useChromeHiddenProgress()
  const glassHeaderInset = useGlassHeaderInset()

  // Travels by the full stack height, not just its own, so it tucks up behind
  // the header rather than colliding with it on the way out.
  const hideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -glassHeaderInset * hidden.value }],
    opacity: 1 - hidden.value
  }))

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setSubHeaderHeight(event.nativeEvent.layout.height)
    },
    [setSubHeaderHeight]
  )

  return (
    <Animated.View
      pointerEvents='box-none'
      style={[styles.root, { top: headerHeight }, hideStyle]}
    >
      <GlassEdgeFade
        height={subHeaderHeight + EDGE_FADE_TAIL}
        fromOpacity={SUB_HEADER_FADE_OPACITY}
        toOpacity={0}
      />
      <View pointerEvents='box-none' onLayout={handleLayout}>
        {children}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: zIndex.HEADER_SHADOW
  }
})
