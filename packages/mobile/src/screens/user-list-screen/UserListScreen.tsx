import type { ReactElement, ReactNode } from 'react'
import { createContext, useCallback, useMemo } from 'react'

import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'

import { Flex, Text } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'

/** Scroll range over which the large title hands off to the header title. */
const TITLE_HANDOFF_START = 20
const TITLE_HANDOFF_END = 44

type LargeTitleContextValue = {
  header: ReactElement
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
}

/**
 * Lets `UserList` render the large title as its list header and report its
 * scroll offset, without every user list screen threading the props through.
 */
export const UserListLargeTitleContext =
  createContext<LargeTitleContextValue | null>(null)

const HeaderTitle = ({
  title,
  scrollY
}: {
  title: ReactNode
  scrollY: SharedValue<number>
}) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [TITLE_HANDOFF_START, TITLE_HANDOFF_END],
      [0, 1],
      'clamp'
    )
  }))

  return (
    <Animated.View style={style}>
      <Text variant='title' size='l' accessibilityRole='header'>
        {title}
      </Text>
    </Animated.View>
  )
}

type UserListScreenProps = {
  title: ReactNode
  children: ReactElement
}

/**
 * A pushed user list (followers, reposts, ...) with a large title at the top of
 * the list that scrolls away into the header.
 */
export const UserListScreen = (props: UserListScreenProps) => {
  const { title, children } = props
  const scrollY = useSharedValue(0)

  const headerTitle = useCallback(
    () => <HeaderTitle title={title} scrollY={scrollY} />,
    [title, scrollY]
  )

  const largeTitle = useMemo(
    () => ({
      header: (
        <Flex ph='l' pt='xs' pb='m'>
          <Text variant='heading' size='l' numberOfLines={2}>
            {title}
          </Text>
        </Flex>
      ),
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.value = event.nativeEvent.contentOffset.y
      }
    }),
    [title, scrollY]
  )

  return (
    <Screen variant='white' title={title} headerTitle={headerTitle}>
      <ScreenContent>
        <UserListLargeTitleContext.Provider value={largeTitle}>
          {children}
        </UserListLargeTitleContext.Provider>
      </ScreenContent>
    </Screen>
  )
}
