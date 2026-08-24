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
 * Pins a screen's persistent top row — feed tabs, trending pills, the library
 * category menu — directly beneath the floating root header as a second glass
 * layer.
 *
 * Without this the row would sit in normal flow and content would scroll
 * behind the translucent header only to collide with an opaque row. Floating
 * it keeps the whole top cluster one continuous frosted surface.
 *
 * The row stays owned by its screen rather than being passed into
 * `MobileRootHeader`'s render prop on purpose: those render props are memoized
 * so that changing tab state doesn't rebuild the header and remount
 * `AccountPictureHeader` (which re-fires the profile-picture fetch).
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
