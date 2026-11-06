import type { ReactNode } from 'react'
import { useCallback } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'

import { GlassCapsule } from 'app/components/core/Screen/GlassCapsule'
import { zIndex } from 'app/utils/zIndex'

import {
  useChromeHiddenProgress,
  useRootHeaderHeight,
  useSetSubHeaderHeight,
  useSubHeaderHeight,
  useSubHeaderScrollOffset
} from './GlassChromeContext'

/** Pill (32) plus 6px of glass around it. */
const PILL_BAR_HEIGHT = 44

type FloatingSubHeaderProps = {
  children: ReactNode
}

/**
 * A screen's tab pills (feed tabs, trending categories) in one glass pill
 * bar under the root header. It scrolls up with the list, then pins under the
 * status bar once the header is gone. While pinned it slides away on scroll
 * down and comes back on scroll up, with the tab bar.
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
  const scrollOffset = useSubHeaderScrollOffset()
  const floating = useSharedValue(1)

  // Glass stops rendering under a parent that fades from 0, so it hides by
  // sliding fully off the top instead.
  const positionStyle = useAnimatedStyle(() => {
    const restingTop = headerHeight - scrollOffset.value
    return {
      transform: [
        {
          translateY:
            -scrollOffset.value - hidden.value * (restingTop + subHeaderHeight)
        }
      ]
    }
  })

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setSubHeaderHeight(event.nativeEvent.layout.height)
    },
    [setSubHeaderHeight]
  )

  return (
    <Animated.View
      pointerEvents='box-none'
      style={[styles.root, { top: headerHeight }, positionStyle]}
      onLayout={handleLayout}
    >
      <GlassCapsule
        height={PILL_BAR_HEIGHT}
        floatProgress={floating}
        style={styles.pillBar}
      >
        <View style={styles.pills}>{children}</View>
      </GlassCapsule>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingVertical: 8,
    zIndex: zIndex.HEADER_SHADOW
  },
  pillBar: {
    alignSelf: 'flex-start'
  },
  pills: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6
  }
})
