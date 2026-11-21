import { Animated, TouchableOpacity, View } from 'react-native'

import { Text } from '@audius/harmony-native'
import { useContentWidth } from 'app/hooks/useContentWidth'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const AnimatedText = Animated.createAnimatedComponent(Text)

const INDICATOR_STRETCH_FACTOR = 0.35

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

  return {
    inputRange,
    outputRange
  }
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  tabBarContainer: {
    elevation: 3,
    marginBottom: -1 * spacing(1),
    paddingBottom: spacing(1),
    position: 'relative',
    zIndex: 100
  },

  tabsContainer: {
    backgroundColor: palette.white,
    shadowColor: palette.neutralDark1,
    shadowOpacity: 0.12,
    shadowOffset: { height: 2, width: 0 },
    shadowRadius: 2,
    flexDirection: 'row'
  },

  tabContainer: {
    flex: 1,
    height: spacing(12)
  },

  tab: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'column',
    height: spacing(12),
    justifyContent: 'space-evenly'
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

export const TopTabBar = ({ state, descriptors, navigation, position }) => {
  const horizontalPadding =
    Math.max(6 - state.routes.length, 0) * HORIZONTAL_PADDING
  const screenWidth = useContentWidth()
  const tabsWidth = screenWidth - horizontalPadding * 2
  const tabWidth = tabsWidth / state.routes.length

  const isFocused = (tabIndex) => state.index === tabIndex
  const styles = useStyles()
  const { neutral } = useThemeColors()

  const onPress = (route, tabIndex: number) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true
    })

    if (!isFocused(tabIndex) && !event.defaultPrevented) {
      navigation.navigate({ name: route.name, merge: true })
    }
  }

  const onLongPress = (route, tabIndex: number) => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key
    })
  }

  const left = position.interpolate({
    inputRange: [0, state.routes.length],
    outputRange: [horizontalPadding, screenWidth - horizontalPadding]
  })

  const xScale = position.interpolate(
    getSinAnimationRanges(state.routes.length)
  )

  return (
    <View style={styles.tabBarContainer}>
      <View
        style={[styles.tabsContainer, { paddingHorizontal: horizontalPadding }]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label = options.tabBarLabel ?? options.title ?? route.name
          const icon = options.tabBarIcon({ color: neutral })

          const inputRange = state.routes.map((_, i) => i)
          const opacity = position.interpolate({
            inputRange,
            outputRange: inputRange.map((i) => (i === index ? 1 : 0.52))
          })

          return (
            <View key={label} style={styles.tabContainer}>
              <TouchableOpacity
                accessibilityLabel={options.tabBarAccessibilityLabel}
                accessibilityRole='button'
                accessibilityState={{ selected: isFocused(index) }}
                activeOpacity={0.8}
                onLongPress={() => onLongPress(route, index)}
                onPress={() => onPress(route, index)}
                style={styles.tab}
                testID={options.tabBarButtonTestID}
              >
                <Animated.View style={{ opacity }}>{icon}</Animated.View>
                <AnimatedText size='xs' strength='strong' style={{ opacity }}>
                  {label}
                </AnimatedText>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            transform: [{ translateX: left }, { scaleX: xScale }],
            width: tabWidth
          }
        ]}
      />
    </View>
  )
}
