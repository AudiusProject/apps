import type { ReactNode } from 'react'
import { useCallback, useContext } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { Text, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDrawer } from 'app/hooks/useDrawer'
import { makeStyles } from 'app/styles'

import { AppDrawerContext } from '../app-drawer-screen'

import { AccountPictureHeader } from './AccountPictureHeader'
import {
  useHeaderScrollOffset,
  useSetRootHeaderHeight
} from './GlassChromeContext'
import {
  EDGE_FADE_FROM_OPACITY,
  EDGE_FADE_TAIL,
  GlassEdgeFade
} from './GlassEdgeFade'

const ROW_HEIGHT = 52

type MobileRootHeaderProps = {
  title: string
  children?: ReactNode
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  row: {
    height: ROW_HEIGHT,
    marginTop: spacing(1),
    marginBottom: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(4)
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: typography.fontByWeight.heavy,
    color: palette.neutral
  }
}))

/**
 * Custom header for root (bottom-bar) tab screens.
 *
 * [Avatar] [title] [right content], flat on the page. It scrolls away with
 * the list, and the content passing under the status bar fades out. It
 * reports its measured height through `GlassChromeContext` so the screen
 * underneath can pad its scrollable content to start below it.
 */
export const MobileRootHeader = (props: MobileRootHeaderProps) => {
  const { title, children } = props
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const setRootHeaderHeight = useSetRootHeaderHeight()
  const scrollOffset = useHeaderScrollOffset()

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -scrollOffset.value }]
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
    <View
      pointerEvents='box-none'
      style={{ paddingTop: insets.top }}
      onLayout={handleLayout}
    >
      <Animated.View pointerEvents='box-none' style={scrollStyle}>
        <View style={styles.row}>
          <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
          <Text
            accessibilityRole='header'
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </Text>
          {children}
        </View>
      </Animated.View>
      <GlassEdgeFade
        height={insets.top + EDGE_FADE_TAIL}
        fromOpacity={EDGE_FADE_FROM_OPACITY}
        toOpacity={0}
      />
    </View>
  )
}
