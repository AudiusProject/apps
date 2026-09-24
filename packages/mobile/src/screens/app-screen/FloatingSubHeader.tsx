import type { ReactNode } from 'react'
import { useCallback } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import { GlassSurface } from 'app/components/core/Screen/GlassSurface'
import { zIndex } from 'app/utils/zIndex'

import {
  useChromeHiddenProgress,
  useGlassHeaderInset,
  useGlassScrollY,
  useRootHeaderHeight,
  useSetSubHeaderHeight
} from './GlassChromeContext'

type FloatingSubHeaderProps = {
  children: ReactNode
  /** Draw a hairline separator along the bottom edge of the glass stack. */
  showBorder?: boolean
}

/**
 * Pins a screen's persistent top row (feed tabs, trending pills) beneath the
 * floating root header as a second glass layer, so content scrolls behind one
 * continuous frosted surface.
 *
 * Owned by the screen rather than passed into `MobileRootHeader`, whose
 * memoized render prop must not rebuild on tab-state changes (that remounts
 * `AccountPictureHeader` and re-fires the profile-picture fetch).
 */
export const FloatingSubHeader = (props: FloatingSubHeaderProps) => {
  const { children, showBorder = true } = props
  const headerHeight = useRootHeaderHeight()
  const setSubHeaderHeight = useSetSubHeaderHeight()
  const scrollY = useGlassScrollY()
  const hidden = useChromeHiddenProgress()
  const glassHeaderInset = useGlassHeaderInset()

  // Travels by the full stack height, not just its own, so it tucks up behind
  // the header rather than colliding with it on the way out.
  const hideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -glassHeaderInset * hidden.value }]
  }))

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setSubHeaderHeight(event.nativeEvent.layout.height)
    },
    [setSubHeaderHeight]
  )

  return (
    <Animated.View style={[styles.root, { top: headerHeight }, hideStyle]}>
      <GlassSurface
        showBorder={showBorder}
        scrollY={scrollY}
        onLayout={handleLayout}
      >
        <View>{children}</View>
      </GlassSurface>
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
