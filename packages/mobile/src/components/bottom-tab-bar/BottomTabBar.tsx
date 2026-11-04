import type { ReactNode } from 'react'
import { useCallback, useEffect } from 'react'

import type {
  BottomTabNavigationEventMap,
  BottomTabBarProps as RNBottomTabBarProps
} from '@react-navigation/bottom-tabs'
import type { NavigationHelpers, ParamListBase } from '@react-navigation/native'
import {
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions
} from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Reanimated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex, IconSearch } from '@audius/harmony-native'
import { GlassSurface } from 'app/components/core/Screen/GlassSurface'
import { LiquidGlassView } from 'app/components/core/Screen/LiquidGlass'
import { FULL_DRAWER_HEIGHT } from 'app/components/drawer'
import { PLAY_BAR_HEIGHT } from 'app/components/now-playing-drawer'
import {
  useIsTabBarCollapsed,
  useTabBarHiddenProgress
} from 'app/screens/app-screen/TabBarAutoHideContext'
import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

import { ExploreButton } from './bottom-tab-bar-buttons/ExploreButton'
import { FeedButton } from './bottom-tab-bar-buttons/FeedButton'
import { LibraryButton } from './bottom-tab-bar-buttons/LibraryButton'
import { NotificationsButton } from './bottom-tab-bar-buttons/NotificationsButton'
import { TrendingButton } from './bottom-tab-bar-buttons/TrendingButton'
import {
  BOTTOM_BAR_HEIGHT,
  COLLAPSE_DROP_START,
  COLLAPSE_SHRINK_END,
  FLOATING_BAR_HEIGHT,
  FLOATING_BAR_INDICATOR_INSET,
  FLOATING_BAR_SIDE_MARGIN
} from './constants'
import { useFloatingTabBar } from './useFloatingTabBar'

const messages = {
  search: 'Search'
}

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

  const handlePressSearch = useCallback(() => {
    navigation.navigate('explore', {
      screen: 'SearchExplore',
      params: { autoFocus: true }
    })
  }, [navigation])

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
          onPressSearch={handlePressSearch}
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
  onPressSearch: () => void
  children: ReactNode[]
}

/**
 * iOS 26 style tab bar: a capsule of liquid glass floating over the content,
 * with a highlight that springs to the active tab.
 *
 * Scrolling down collapses it rather than hiding it: the capsule shrinks to a
 * circle holding the active tab, a search button appears on the right, and the
 * play bar drops in between them. Tapping the active tab scrolls back to the
 * top, which expands the bar again.
 */
const FloatingPill = (props: FloatingPillProps) => {
  const { bottom, activeIndex, tabCount, onPressSearch, children } = props
  const isDarkMode = isDarkTheme(useThemeVariant())
  const colorScheme = isDarkMode ? 'dark' : 'light'
  const { width: windowWidth } = useWindowDimensions()
  const hidden = useTabBarHiddenProgress()
  const isCollapsed = useIsTabBarCollapsed()
  const index = useSharedValue(activeIndex)

  const fullWidth = windowWidth - FLOATING_BAR_SIDE_MARGIN * 2
  const tabWidth = fullWidth / tabCount

  useEffect(() => {
    index.value = withSpring(activeIndex, {
      damping: 18,
      stiffness: 220,
      mass: 0.8
    })
  }, [activeIndex, index])

  const pillStyle = useAnimatedStyle(() => ({
    width: interpolate(
      hidden.value,
      [0, COLLAPSE_SHRINK_END],
      [fullWidth, FLOATING_BAR_HEIGHT],
      'clamp'
    )
  }))

  // Slide the row so the active tab ends up centered in the collapsed circle.
  const rowStyle = useAnimatedStyle(() => {
    const activeCenter = (index.value + 0.5) * tabWidth
    const shrink = interpolate(
      hidden.value,
      [0, COLLAPSE_SHRINK_END],
      [0, 1],
      'clamp'
    )
    return {
      transform: [
        {
          translateX: (FLOATING_BAR_HEIGHT / 2 - activeCenter) * shrink
        }
      ]
    }
  })

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      hidden.value,
      [0, COLLAPSE_SHRINK_END],
      [1, 0],
      'clamp'
    ),
    transform: [
      {
        translateX: index.value * tabWidth + FLOATING_BAR_INDICATOR_INSET
      }
    ]
  }))

  // Grows from a point rather than fading in, since the system glass stops
  // rendering under a parent that starts at zero opacity. Comes in with the
  // play bar, once the capsule has pulled back.
  const searchStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          hidden.value,
          [COLLAPSE_DROP_START, 1],
          [0.01, 1],
          'clamp'
        )
      }
    ]
  }))

  return (
    <>
      <Reanimated.View style={[styles.pill, { bottom }, pillStyle]}>
        <LiquidGlassView
          effect='regular'
          interactive
          colorScheme={colorScheme}
          style={styles.pillGlass}
        >
          <Reanimated.View
            pointerEvents='none'
            style={[
              styles.indicator,
              {
                width: tabWidth - FLOATING_BAR_INDICATOR_INSET * 2,
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(0, 0, 0, 0.06)'
              },
              indicatorStyle
            ]}
          />
          <Reanimated.View
            style={[styles.pillRow, { width: fullWidth }, rowStyle]}
          >
            {children.map((child, i) => (
              <CollapsingTab
                key={i}
                hidden={hidden}
                isActive={i === activeIndex}
                isCollapsed={isCollapsed}
              >
                {child}
              </CollapsingTab>
            ))}
          </Reanimated.View>
        </LiquidGlassView>
      </Reanimated.View>
      <Reanimated.View
        pointerEvents={isCollapsed ? 'auto' : 'none'}
        style={[styles.searchButton, { bottom }, searchStyle]}
      >
        <LiquidGlassView
          effect='regular'
          interactive
          colorScheme={colorScheme}
          style={styles.pillGlass}
        >
          <Pressable
            onPress={onPressSearch}
            accessibilityRole='button'
            accessibilityLabel={messages.search}
            style={styles.searchPressable}
          >
            <IconSearch size='l' color='default' />
          </Pressable>
        </LiquidGlassView>
      </Reanimated.View>
    </>
  )
}

type CollapsingTabProps = {
  hidden: SharedValue<number>
  isActive: boolean
  isCollapsed: boolean
  children: ReactNode
}

/** Fades the inactive tabs out ahead of the capsule closing over them. */
const CollapsingTab = (props: CollapsingTabProps) => {
  const { hidden, isActive, isCollapsed, children } = props
  const style = useAnimatedStyle(() => ({
    opacity: isActive
      ? 1
      : interpolate(hidden.value, [0, 0.35], [1, 0], 'clamp')
  }))

  return (
    <Reanimated.View
      pointerEvents={isCollapsed && !isActive ? 'none' : 'box-none'}
      style={[styles.tab, style]}
    >
      {children}
    </Reanimated.View>
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
    height: FLOATING_BAR_HEIGHT
  },
  pillGlass: {
    flex: 1,
    borderRadius: FLOATING_BAR_HEIGHT / 2,
    overflow: 'hidden'
  },
  pillRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row'
  },
  tab: {
    flex: 1
  },
  searchButton: {
    position: 'absolute',
    right: FLOATING_BAR_SIDE_MARGIN,
    width: FLOATING_BAR_HEIGHT,
    height: FLOATING_BAR_HEIGHT
  },
  searchPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: FLOATING_BAR_INDICATOR_INSET,
    bottom: FLOATING_BAR_INDICATOR_INSET,
    borderRadius: FLOATING_BAR_HEIGHT / 2
  }
})
