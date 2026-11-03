import type { ReactNode } from 'react'
import { useCallback, useContext } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { Text, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassCapsule } from 'app/components/core/Screen/GlassCapsule'
import { OtaUpdateBanner } from 'app/components/ota-update-banner/OtaUpdateBanner'
import { useDrawer } from 'app/hooks/useDrawer'
import { makeStyles } from 'app/styles'

import { AppDrawerContext } from '../app-drawer-screen'

import { AccountPictureHeader } from './AccountPictureHeader'
import {
  useChromeHiddenProgress,
  useGlassHeaderInset,
  useRootHeaderHeight,
  useSetRootHeaderHeight
} from './GlassChromeContext'
import {
  EDGE_FADE_FROM_OPACITY,
  EDGE_FADE_TAIL,
  GlassEdgeFade,
  SUB_HEADER_FADE_OPACITY
} from './GlassEdgeFade'

const CAPSULE_HEIGHT = 52

type MobileRootHeaderProps = {
  title: string
  children?: ReactNode
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  capsule: {
    marginHorizontal: spacing(4),
    marginTop: spacing(1),
    marginBottom: spacing(2)
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingLeft: spacing(2),
    paddingRight: spacing(2)
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
 * A floating glass capsule, [Avatar] [title] [right content], matching the
 * floating tab bar. Content scrolls under it with a fade behind the status
 * bar. It reports its measured height through `GlassChromeContext` so the
 * screen underneath can pad its scrollable content to start below it.
 */
export const MobileRootHeader = (props: MobileRootHeaderProps) => {
  const { title, children } = props
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const setRootHeaderHeight = useSetRootHeaderHeight()
  const hidden = useChromeHiddenProgress()
  const headerHeight = useRootHeaderHeight()
  const hasSubHeader = useGlassHeaderInset() > headerHeight

  // Slide the capsule off the top as the chrome hides. Visual only: the list
  // keeps its padding so content doesn't reflow.
  const hideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -headerHeight * hidden.value }]
  }))

  // The fade behind the capsule goes with it; the status bar fade stays.
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value
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
      <GlassEdgeFade
        height={insets.top + EDGE_FADE_TAIL}
        fromOpacity={EDGE_FADE_FROM_OPACITY}
        toOpacity={0}
      />
      <GlassEdgeFade
        height={headerHeight + (hasSubHeader ? 0 : EDGE_FADE_TAIL)}
        fromOpacity={EDGE_FADE_FROM_OPACITY}
        toOpacity={hasSubHeader ? SUB_HEADER_FADE_OPACITY : 0}
        style={fadeStyle}
      />
      <Animated.View pointerEvents='box-none' style={hideStyle}>
        <OtaUpdateBanner />
        <GlassCapsule height={CAPSULE_HEIGHT} style={styles.capsule}>
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
        </GlassCapsule>
      </Animated.View>
    </View>
  )
}
