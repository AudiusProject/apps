import { useCallback } from 'react'

import type {
  BottomTabNavigationEventMap,
  BottomTabBarProps as RNBottomTabBarProps
} from '@react-navigation/bottom-tabs'
import type { NavigationHelpers, ParamListBase } from '@react-navigation/native'
import { Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex } from '@audius/harmony-native'
import { FULL_DRAWER_HEIGHT } from 'app/components/drawer'
import { PLAY_BAR_HEIGHT } from 'app/components/now-playing-drawer'

import { ExploreButton } from './bottom-tab-bar-buttons/ExploreButton'
import { FeedButton } from './bottom-tab-bar-buttons/FeedButton'
import { LibraryButton } from './bottom-tab-bar-buttons/LibraryButton'
import { NotificationsButton } from './bottom-tab-bar-buttons/NotificationsButton'
import { TrendingButton } from './bottom-tab-bar-buttons/TrendingButton'
import { BOTTOM_BAR_HEIGHT } from './constants'

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

  return (
    <Animated.View
      style={[
        { zIndex: 4, elevation: 4 },
        interpolatePostion(translationAnim, insets.bottom)
      ]}
    >
      <Flex
        row
        pointerEvents='auto'
        borderTop='default'
        backgroundColor='surface1'
        wrap='nowrap'
        justifyContent='space-evenly'
        pb={insets.bottom}
      >
        {routes.map(({ name, key }, index) => {
          const BottomTabBarButton = bottomTabBarButtons[name]

          return (
            <BottomTabBarButton
              key={key}
              routeKey={key}
              isActive={index === activeIndex}
              onPress={handlePress}
              onLongPress={handleLongPress}
            />
          )
        })}
      </Flex>
    </Animated.View>
  )
}
