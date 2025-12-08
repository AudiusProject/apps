import { TouchableOpacity, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  Extrapolate
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

import { Text } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const useStyles = makeStyles(({ spacing }) => ({
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
  }
}))

export type TabItemProps = {
  route: any
  index: number
  isFocused: boolean
  indexDecimal: SharedValue<number>
  options: any
  onPress: () => void
  onLongPress: () => void
}

export const TabItem = ({
  route,
  index,
  isFocused,
  indexDecimal,
  options,
  onPress,
  onLongPress
}: TabItemProps) => {
  const styles = useStyles()
  const { neutral } = useThemeColors()
  const label = options.tabBarLabel ?? options.title ?? route.name
  const icon = options.tabBarIcon({ color: neutral })

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1]
    return {
      opacity: interpolate(
        indexDecimal.value,
        inputRange,
        [0.52, 1, 0.52],
        Extrapolate.CLAMP
      )
    }
  })

  return (
    <Animated.View style={[styles.tabContainer, animatedStyle]}>
      <TouchableOpacity
        accessibilityLabel={options.tabBarAccessibilityLabel}
        accessibilityRole='button'
        accessibilityState={{ selected: isFocused }}
        activeOpacity={0.8}
        onLongPress={onLongPress}
        onPress={onPress}
        style={styles.tab}
        testID={options.tabBarTestID}
      >
        <View>{icon}</View>
        <Text size='xs' strength='strong'>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  )
}
