import { useCallback, useMemo } from 'react'

import { Pressable } from 'react-native'
import type { GestureResponderEvent, ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'
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
    gradient,
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
  const isTextChild = typeof children === 'string'

  const childElement = isTextChild ? (
    <AnimatedText
      {...innerProps?.text}
      style={styles?.text}
      numberOfLines={1}
      ellipsizeMode='tail'
    >
      {children}
    </AnimatedText>
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

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onPress?.(e)
      if (haptics) {
        haptic.medium()
      }
    },
    [onPress, haptics]
  )

  // Create animated versions of icon components when animatedProps is present
  const hasAnimatedProps = !!innerProps?.icon?.animatedProps
  const AnimatedLeftIcon = useMemo(
    () =>
      hasAnimatedProps && LeftIconComponent
        ? Animated.createAnimatedComponent(LeftIconComponent)
        : null,
    [hasAnimatedProps, LeftIconComponent]
  )
  const AnimatedRightIcon = useMemo(
    () =>
      hasAnimatedProps && RightIconComponent
        ? Animated.createAnimatedComponent(RightIconComponent)
        : null,
    [hasAnimatedProps, RightIconComponent]
  )

  // Extract icon props, separating animatedProps from regular props
  const iconProps = innerProps?.icon
  const { animatedProps, ...restIconProps } = iconProps || {}

  const renderIcon = (
    IconComponent: typeof LeftIconComponent,
    AnimatedIcon: React.ComponentType<any> | null
  ) => {
    if (!IconComponent) return null

    if (AnimatedIcon && animatedProps) {
      return (
        <AnimatedIcon
          {...restIconProps}
          animatedProps={animatedProps}
          style={styles?.icon}
          color={isStaticIcon ? 'default' : restIconProps?.color}
        />
      )
    }

    return (
      <IconComponent
        {...restIconProps}
        style={styles?.icon}
        color={isStaticIcon ? 'default' : restIconProps?.color}
      />
    )
  }

  return (
    <GestureDetector gesture={tap}>
      <AnimatedPressable
        style={[rootStyles, animatedStyles, style]}
        onPress={handlePress}
        {...other}
      >
        {gradient ? (
          <LinearGradient
            {...gradient}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />
        ) : null}
        {isLoading ? (
          <LoadingSpinner {...innerProps?.loader} />
        ) : (
          renderIcon(LeftIconComponent, AnimatedLeftIcon)
        )}
        {childElement}
        {renderIcon(RightIconComponent, AnimatedRightIcon)}
      </AnimatedPressable>
    </GestureDetector>
  )
}
