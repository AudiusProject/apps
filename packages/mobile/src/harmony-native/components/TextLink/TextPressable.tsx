import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import { useTheme } from '../../foundations/theme/useTheme'
import { Text } from '../Text/Text'

import { type TextLinkProps } from './types'

const AnimatedText = Animated.createAnimatedComponent(Text)

export const TextPressable = (props: TextLinkProps) => {
  const {
    children,
    variant = 'default',
    textVariant,
    showUnderline,
    style,
    animatedPressed: animatedPressedProp,
    ...other
  } = props

  const { color, motion, type } = useTheme()

  const animatedPressedInternal = useSharedValue(0)
  const animatedPressed = animatedPressedProp ?? animatedPressedInternal

  const variantColors = {
    default: color.link.default,
    subdued: color.link.subdued,
    visible: color.link.visible,
    inverted: color.static.white,
    active: color.primary.primary
  }

  const variantPressingColors = {
    default: color.primary.p300,
    subdued: color.primary.p300,
    visible: color.static.white,
    inverted: color.link.visible,
    active: color.primary.primary
  }

  const animatedStyles = useAnimatedStyle(
    () => ({
      color: interpolateColor(
        animatedPressed.value,
        [0, 1],
        [variantColors[variant], variantPressingColors[variant]]
      )
    }),
    [variant, type]
  )

  return (
    <Text
      suppressHighlighting
      variant={textVariant}
      onPressIn={(e) => {
        animatedPressed.value = withTiming(1, motion.press)
      }}
      onPressOut={() => {
        animatedPressed.value = withTiming(0, motion.press)
      }}
      style={style}
      {...other}
    >
      <Text>
        <AnimatedText
          style={[
            style,
            animatedStyles,
            { textDecorationLine: showUnderline ? 'underline' : 'none' }
          ]}
        >
          {children}
        </AnimatedText>
      </Text>
    </Text>
  )
}
