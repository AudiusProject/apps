import { useMemo } from 'react'

import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs'
import { Dimensions, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'

import type { TabBarProps } from 'app/components/collapsible-tabs'
import { makeStyles } from 'app/styles'

import { TabItem } from './TabItem'

// How much the tab indicator should horizontally stretch
// while it translates for a nice effect.
const INDICATOR_STRETCH_FACTOR = 0.35

// This granularity is how many points of the sin function are added to the stretch animation
// (min value) 1 will not add any points in between and, therefore, there will be no stretching
// (recommended min value) 2 will be a linear stretch to max width and back
// Values above 2 will start to conform to a sin function curve of stretching
// The higher the number, the more accurate the line stretch will follow the sin function
const INDICATOR_ANIM_GRANULARITY = 10

const HORIZONTAL_PADDING = 8

const getSinAnimationRanges = (len: number) => {
  const inputRange: number[] = []
  const outputRange: number[] = []

  let i = 0
  while (i < len) {
    inputRange.push(i)
    outputRange.push(Math.sin((i % 1) * Math.PI) * INDICATOR_STRETCH_FACTOR + 1)
    i += 1 / INDICATOR_ANIM_GRANULARITY
  }

  return { inputRange, outputRange }
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  tabsContainer: {
    backgroundColor: palette.white,
    flexDirection: 'row'
  },

  tabIndicator: {
    backgroundColor: palette.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: 3,
    position: 'absolute',
    top: spacing(12),
    zIndex: 9
  }
}))

export type CollapsibleTopTabBarProps = TabBarProps &
  Pick<MaterialTopTabBarProps, 'state' | 'descriptors' | 'navigation'>

export const CollapsibleTopTabBar = (props: CollapsibleTopTabBarProps) => {
  const { state, descriptors, navigation, onTabPress, indexDecimal } = props
  const positionValue = indexDecimal
  const styles = useStyles()

  // Horizontal padding decreases as the number of tabs increases
  const horizontalPadding =
    Math.max(6 - state.routes.length, 0) * HORIZONTAL_PADDING
  const screenWidth = Dimensions.get('screen').width
  const tabsWidth = screenWidth - horizontalPadding * 2
  const tabWidth = tabsWidth / state.routes.length

  const isFocused = (tabIndex: number) => state.index === tabIndex

  const onPressTab = (route: any, tabIndex: number) => {
    onTabPress(route.name)

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true
    })

    if (!isFocused(tabIndex) && !event.defaultPrevented) {
      // @ts-expect-error The `merge: true` option makes sure that the params inside the tab screen are preserved
      navigation.navigate({ name: route.name, merge: true })
    }
  }

  const onLongPressTab = (route: any) => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key
    })
  }

  const sinInputRange = useMemo(
    () => getSinAnimationRanges(state.routes.length),
    [state.routes.length]
  )

  const indicatorStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            positionValue.value,
            [0, state.routes.length],
            [horizontalPadding, screenWidth - horizontalPadding]
          )
        },
        {
          scaleX: interpolate(
            positionValue.value,
            sinInputRange.inputRange,
            sinInputRange.outputRange
          )
        }
      ]
    }
  })

  return (
    <>
      <View
        style={[styles.tabsContainer, { paddingHorizontal: horizontalPadding }]}
      >
        {state.routes.map((route: any, index: number) => (
          <TabItem
            key={route.key}
            route={route}
            index={index}
            isFocused={isFocused(index)}
            indexDecimal={positionValue}
            options={descriptors[route.key].options}
            onPress={() => onPressTab(route, index)}
            onLongPress={() => onLongPressTab(route)}
          />
        ))}
      </View>
      <Animated.View
        style={[styles.tabIndicator, indicatorStyles, { width: tabWidth }]}
      />
    </>
  )
}
