import type { ReactNode } from 'react'
import { useCallback, useContext } from 'react'

import type { LayoutChangeEvent } from 'react-native'
import { View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GradientText } from 'app/components/core'
import { GlassSurface } from 'app/components/core/Screen/GlassSurface'
import { OtaUpdateBanner } from 'app/components/ota-update-banner/OtaUpdateBanner'
import { useDrawer } from 'app/hooks/useDrawer'
import { makeStyles } from 'app/styles'

import { AppDrawerContext } from '../app-drawer-screen'

import { AccountPictureHeader } from './AccountPictureHeader'
import {
  useChromeHiddenProgress,
  useGlassScrollY,
  useRootHeaderHeight,
  useSetRootHeaderHeight
} from './GlassChromeContext'

type MobileRootHeaderProps = {
  title: string
  children?: ReactNode
  showDivider?: boolean
}

const useStyles = makeStyles(({ spacing, typography }) => ({
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
  }
}))

/**
 * Custom header for root (bottom-bar) tab screens.
 *
 * Layout (single row): [Avatar] [GradientText title] [right content]
 *
 * The header floats over its screen so content scrolls behind the frosted
 * glass, matching the desktop client's `Frosted` surface. It reports its
 * measured height through `GlassChromeContext` so the screen underneath
 * can pad its scrollable content to start below the header.
 */
export const MobileRootHeader = (props: MobileRootHeaderProps) => {
  const { title, children, showDivider = true } = props
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const setRootHeaderHeight = useSetRootHeaderHeight()
  const scrollY = useGlassScrollY()
  const hidden = useChromeHiddenProgress()
  const headerHeight = useRootHeaderHeight()

  // Slide the header off the top as the chrome hides. Visual only: the list
  // keeps its padding so content doesn't reflow.
  const hideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -headerHeight * hidden.value }]
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
    <Animated.View style={hideStyle}>
      <GlassSurface
        showBorder={showDivider}
        scrollY={scrollY}
        onLayout={handleLayout}
      >
        <View style={{ marginTop: insets.top }}>
          <OtaUpdateBanner />
          <View style={styles.row}>
            <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
            <View style={styles.titleContainer}>
              <GradientText accessibilityRole='header' style={styles.title}>
                {title}
              </GradientText>
            </View>
            {children}
          </View>
        </View>
      </GlassSurface>
    </Animated.View>
  )
}
