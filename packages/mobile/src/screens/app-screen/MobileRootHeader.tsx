import type { ReactNode } from 'react'
import { useCallback, useContext } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GradientText } from 'app/components/core'
import { useDrawer } from 'app/hooks/useDrawer'
import { makeStyles } from 'app/styles'

import { AppDrawerContext } from '../app-drawer-screen'

import { AccountPictureHeader } from './AccountPictureHeader'
import { CompactTitlePill } from './CompactHeader'
import {
  useCompactTitleProgress,
  useGlassScrollY,
  useHeaderScrollOffset,
  useSetRootHeaderHeight
} from './GlassChromeContext'
import {
  EDGE_FADE_FROM_OPACITY,
  EDGE_FADE_TAIL,
  GlassEdgeFade
} from './GlassEdgeFade'

const EDGE_FADE_DISTANCE = 24

type MobileRootHeaderProps = {
  title: string
  children?: ReactNode
  showDivider?: boolean
  hasSubHeader?: boolean
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  block: {
    backgroundColor: palette.white
  },
  overscrollFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: 1000,
    backgroundColor: palette.white
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3)
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: typography.fontByWeight.bold
  },
  titleContainer: {
    flex: 1,
    minWidth: 0
  },
  divider: {
    height: 1,
    backgroundColor: palette.neutralLight8
  }
}))

export const MobileRootHeader = (props: MobileRootHeaderProps) => {
  const { title, children, showDivider = true, hasSubHeader = false } = props
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const setRootHeaderHeight = useSetRootHeaderHeight()
  const scrollY = useGlassScrollY()
  const scrollOffset = useHeaderScrollOffset()
  const compactProgress = useCompactTitleProgress()

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -scrollOffset.value }]
  }))
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, EDGE_FADE_DISTANCE],
      [0, 1],
      'clamp'
    )
  }))

  const handleOpenLeftNavDrawer = useCallback(() => {
    if (isNowPlayingDrawerOpen) return
    drawerHelpers?.openDrawer()
  }, [drawerHelpers, isNowPlayingDrawerOpen])

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setRootHeaderHeight(event.nativeEvent.layout.height)
    },
    [setRootHeaderHeight]
  )

  return (
    <View pointerEvents='box-none' onLayout={handleLayout}>
      <Animated.View
        style={[styles.block, { paddingTop: insets.top }, scrollStyle]}
      >
        <View style={styles.overscrollFill} />
        <View style={styles.row}>
          <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
          <View style={styles.titleContainer}>
            <GradientText
              accessibilityRole='header'
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </GradientText>
          </View>
          {children}
        </View>
        {showDivider ? <View style={styles.divider} /> : null}
      </Animated.View>
      <GlassEdgeFade
        height={insets.top + EDGE_FADE_TAIL}
        fromOpacity={EDGE_FADE_FROM_OPACITY}
        toOpacity={0}
        style={fadeStyle}
      />
      {!hasSubHeader ? (
        <CompactTitlePill title={title} progress={compactProgress} />
      ) : null}
    </View>
  )
}
