import type { ReactNode } from 'react'
import { useCallback, useEffect } from 'react'

import type {
  BottomTabNavigationEventMap,
  BottomTabBarProps as RNBottomTabBarProps
} from '@react-navigation/bottom-tabs'
import type { NavigationHelpers, ParamListBase } from '@react-navigation/native'
import type { LayoutChangeEvent } from 'react-native'
import { Animated, StyleSheet, View } from 'react-native'
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex } from '@audius/harmony-native'
import { GlassSurface } from 'app/components/core/Screen/GlassSurface'
import { LiquidGlassView } from 'app/components/core/Screen/LiquidGlass'
import { FULL_DRAWER_HEIGHT } from 'app/components/drawer'
import { PLAY_BAR_HEIGHT } from 'app/components/now-playing-drawer'
import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

import { ExploreButton } from './bottom-tab-bar-buttons/ExploreButton'
import { FeedButton } from './bottom-tab-bar-buttons/FeedButton'
import { LibraryButton } from './bottom-tab-bar-buttons/LibraryButton'
import { NotificationsButton } from './bottom-tab-bar-buttons/NotificationsButton'
import { TrendingButton } from './bottom-tab-bar-buttons/TrendingButton'
import {
  BOTTOM_BAR_HEIGHT,
  FLOATING_BAR_HEIGHT,
  FLOATING_BAR_INDICATOR_INSET,
  FLOATING_BAR_SIDE_MARGIN
} from './constants'
import { useFloatingTabBar } from './useFloatingTabBar'

export const bottomTabBarButtons = {
  feed: FeedButton,
  trending: TrendingButton,
  explore: ExploreButton,
  library: LibraryButton,
  notifications: NotificationsButton
}

const interpolatePostion = (
  translationAnim: Animated.Value,
  bottomInset: number
) => ({
  transform: [
    {
      translateY: translationAnim.interpolate({
        inputRange: [
          0,
          FULL_DRAWER_HEIGHT -
            bottomInset -
            BOTTOM_BAR_HEIGHT -
            PLAY_BAR_HEIGHT,
          FULL_DRAWER_HEIGHT
        ],
        outputRange: [bottomInset + BOTTOM_BAR_HEIGHT, 0, 0]
      })
    }
  ]
})

export type BottomTabBarProps = Pick<RNBottomTabBarProps, 'state'> & {
  /**
   * Translation animation to move the bottom bar as drawers
   * are opened behind it
   */
  translationAnim: Animated.Value

  navigation: NavigationHelpers<
    ParamListBase,
    BottomTabNavigationEventMap & {
      scrollToTop: {
        data: undefined
      }
    }
  >
}

export const BottomTabBar = (props: BottomTabBarProps) => {
  const { translationAnim, navigation, state } = props
  const { routes, index: activeIndex } = state
  const insets = useSafeAreaInsets()
  const floating = useFloatingTabBar()

  const handlePress = useCallback(
    (isFocused: boolean, routeName: string, routeKey: string) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true
      })

      // Native navigation
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName)
      } else if (isFocused) {
        navigation.emit({
          type: 'scrollToTop'
        })
      }
    },
    [navigation]
  )

  const handleLongPress = useCallback(() => {
    navigation.emit({
      type: 'scrollToTop'
    })
  }, [navigation])

  const buttons = routes.map(({ name, key }, index) => {
    const BottomTabBarButton = bottomTabBarButtons[name]

    return (
      <BottomTabBarButton
        key={key}
        routeKey={key}
        isActive={index === activeIndex}
        onPress={handlePress}
        onLongPress={handleLongPress}
        floating={!!floating}
      />
    )
  })

  if (floating) {
    return (
      <Animated.View
        pointerEvents='box-none'
        style={[
          styles.floatingRoot,
          { height: BOTTOM_BAR_HEIGHT + insets.bottom },
          interpolatePostion(translationAnim, insets.bottom)
        ]}
      >
        <FloatingPill
          bottom={floating.pillBottom}
          activeIndex={activeIndex}
          tabCount={routes.length}
        >
          {buttons}
        </FloatingPill>
      </Animated.View>
    )
  }

  return (
    <Animated.View
      style={[
        { zIndex: 4, elevation: 4 },
        interpolatePostion(translationAnim, insets.bottom)
      ]}
    >
      {/*
        Frosted rather than a solid fill so content scrolls behind the bar,
        matching the floating header stack. The separator goes on the top edge
        here — that's the side content passes under.
      */}
      <GlassSurface borderEdge='top'>
        <Flex
          row
          pointerEvents='auto'
          wrap='nowrap'
          justifyContent='space-evenly'
          pb={insets.bottom}
        >
          {buttons}
        </Flex>
      </GlassSurface>
    </Animated.View>
  )
}

type FloatingPillProps = {
  bottom: number
  activeIndex: number
  tabCount: number
  children: ReactNode
}

/**
 * iOS 26 style tab bar: a capsule of liquid glass floating over the content,
 * with a highlight that springs to the active tab.
 */
const FloatingPill = (props: FloatingPillProps) => {
  const { bottom, activeIndex, tabCount, children } = props
  const isDarkMode = isDarkTheme(useThemeVariant())
  const pillWidth = useSharedValue(0)
  const index = useSharedValue(activeIndex)

  useEffect(() => {
    index.value = withSpring(activeIndex, {
      damping: 18,
      stiffness: 220,
      mass: 0.8
    })
  }, [activeIndex, index])

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      pillWidth.value = e.nativeEvent.layout.width
    },
    [pillWidth]
  )

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = pillWidth.value / tabCount
    return {
      opacity: pillWidth.value > 0 ? 1 : 0,
      width: tabWidth - FLOATING_BAR_INDICATOR_INSET * 2,
      transform: [
        {
          translateX: index.value * tabWidth + FLOATING_BAR_INDICATOR_INSET
        }
      ]
    }
  })

  return (
    <LiquidGlassView
      effect='regular'
      interactive
      colorScheme={isDarkMode ? 'dark' : 'light'}
      onLayout={handleLayout}
      style={[styles.pill, { bottom }]}
    >
      <Reanimated.View
        pointerEvents='none'
        style={[
          styles.indicator,
          {
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.06)'
          },
          indicatorStyle
        ]}
      />
      <View style={styles.pillRow}>{children}</View>
    </LiquidGlassView>
  )
}

const styles = StyleSheet.create({
  floatingRoot: {
    zIndex: 4,
    elevation: 4
  },
  pill: {
    position: 'absolute',
    left: FLOATING_BAR_SIDE_MARGIN,
    right: FLOATING_BAR_SIDE_MARGIN,
    height: FLOATING_BAR_HEIGHT,
    borderRadius: FLOATING_BAR_HEIGHT / 2
  },
  pillRow: {
    flex: 1,
    flexDirection: 'row'
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: FLOATING_BAR_INDICATOR_INSET,
    bottom: FLOATING_BAR_INDICATOR_INSET,
    borderRadius: FLOATING_BAR_HEIGHT / 2
  }
})
