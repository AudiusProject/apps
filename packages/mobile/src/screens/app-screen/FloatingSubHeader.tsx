import type { ReactNode } from 'react'
import { useCallback } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import { makeStyles } from 'app/styles'
import { zIndex } from 'app/utils/zIndex'

import { CompactControls } from './CompactHeader'
import {
  useCompactControlsProgress,
  useHeaderScrollOffset,
  useRootHeaderHeight,
  useSetSubHeaderHeight
} from './GlassChromeContext'

type FloatingSubHeaderProps = {
  /** The in-flow row under the title (e.g. large tab pills). */
  children: ReactNode
  /**
   * Smaller copy of the controls, shown in a glass bar under the compact
   * title pill once the in-flow row has scrolled away.
   */
  compact?: ReactNode
  /** Pads the row to the screen gutter. Off for full-width rows. */
  padded?: boolean
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  row: {
    backgroundColor: palette.white
  },
  padded: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2)
  }
}))

/**
 * A screen's controls row (feed tabs, trending categories) under the root
 * header. It scrolls away with the header, then its compact copy pins under
 * the compact title pill.
 *
 * Owned by the screen rather than passed into `MobileRootHeader`, whose
 * memoized render prop must not rebuild on tab-state changes (that remounts
 * `AccountPictureHeader` and re-fires the profile-picture fetch).
 */
export const FloatingSubHeader = (props: FloatingSubHeaderProps) => {
  const { children, compact, padded = true } = props
  const styles = useStyles()
  const headerHeight = useRootHeaderHeight()
  const setSubHeaderHeight = useSetSubHeaderHeight()
  const scrollOffset = useHeaderScrollOffset()
  const compactProgress = useCompactControlsProgress()

  const positionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -scrollOffset.value }]
  }))

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setSubHeaderHeight(event.nativeEvent.layout.height)
    },
    [setSubHeaderHeight]
  )

  return (
    <>
      <Animated.View
        style={[
          layout.root,
          styles.row,
          padded ? styles.padded : null,
          { top: headerHeight },
          positionStyle
        ]}
        onLayout={handleLayout}
      >
        {children}
      </Animated.View>
      {compact ? (
        <CompactControls progress={compactProgress}>{compact}</CompactControls>
      ) : null}
    </>
  )
}

const layout = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: zIndex.HEADER_SHADOW
  }
})
