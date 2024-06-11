import { useCallback, useState } from 'react'

import { Pressable } from 'react-native'
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  ViewStyle
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import * as haptic from 'app/haptics'

import { useTheme } from '../../../foundations/theme'
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner'
import { Text } from '../../Text/Text'

import type { BaseButtonProps } from './types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)
const AnimatedText = Animated.createAnimatedComponent(Text)

export const BaseButton = (props: BaseButtonProps) => {
  const {
    iconLeft: LeftIconComponent,
    iconRight: RightIconComponent,
    isLoading,
    isStaticIcon,
    widthToHideText,
    innerProps,
    children,
    style,
    styles,
    sharedValue: sharedValueProp,
    minWidth,
    fullWidth,
    pressScale = 0.97,
    onPress,
    haptics,
    ...other
  } = props
  const pressedInternal = useSharedValue(0)
  const pressed = sharedValueProp || pressedInternal
  const { spacing, motion } = useTheme()
  const [buttonWidth, setButtonWidth] = useState<number | null>(null)
  const isTextChild = typeof children === 'string'

  const isTextHidden =
    isTextChild &&
    widthToHideText &&
    buttonWidth &&
    buttonWidth <= widthToHideText

  const childElement = isTextChild ? (
    !isTextHidden ? (
      <AnimatedText {...innerProps?.text} style={styles?.text}>
        {children}
      </AnimatedText>
    ) : null
  ) : (
    children
  )

  const tap = Gesture.Tap()
    .onBegin(() => {
      pressed.value = withTiming(1, motion.hover)
    })
    .onFinalize(() => {
      pressed.value = withTiming(0, motion.press)
    })

  const rootStyles: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
    minWidth,
    ...(fullWidth && {
      width: '100%',
      flexShrink: 1
    })
  }

  const animatedStyles = useAnimatedStyle(() => ({
    ...(!fullWidth && {
      transform: [
        { scale: interpolate(pressed.value, [0, 1], [1, pressScale]) }
      ]
    })
  }))

  const handleLayoutChange = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout
    setButtonWidth(width)
  }, [])

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      if (haptics) {
        haptic.medium()
      }
    },
    [onPress, haptics]
  )

  return (
    <GestureDetector gesture={tap}>
      <AnimatedPressable
        style={[rootStyles, animatedStyles, style]}
        onLayout={handleLayoutChange}
        onPress={handlePress}
        {...other}
      >
        {isLoading ? (
          <LoadingSpinner {...innerProps?.loader} />
        ) : LeftIconComponent ? (
          <LeftIconComponent
            {...innerProps?.icon}
            color={isStaticIcon ? 'default' : innerProps?.icon?.color}
          />
        ) : null}
        {childElement}
        {RightIconComponent ? (
          <RightIconComponent
            {...innerProps?.icon}
            color={isStaticIcon ? 'default' : innerProps?.icon?.color}
          />
        ) : null}
      </AnimatedPressable>
    </GestureDetector>
  )
}
