import type { ReactNativeStyle } from '@emotion/native'
import type { TextStyle } from 'react-native'
import { Platform } from 'react-native'
import {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'

import { animatedPropAdapter } from 'app/utils/animation'

import { useTheme } from '../../../foundations/theme'
import { BaseButton } from '../BaseButton/BaseButton'

import type { PlainButtonProps } from './types'

/**
 * A plain Button component (no border/background). Includes a few variants and options to
 * include and position icons.
 */
export const PlainButton = (props: PlainButtonProps) => {
  const { variant = 'default', size = 'default', styles, ...baseProps } = props
  const { disabled, isLoading, onPress } = baseProps
  const isDisabled = disabled || isLoading
  const isPressable = !isDisabled && onPress
  const { color, spacing, typography, type } = useTheme()
  const pressed = useSharedValue(0)

  // - Size Styles -
  const defaultStyles: ReactNativeStyle = {
    gap: spacing.xs,
    height: 16
  }
  const defaultTextStyles: TextStyle = {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.size.s,
    lineHeight: typography.lineHeight.s
  }

  const largeStyles: ReactNativeStyle = {
    gap: spacing.s,
    height: 20
  }
  const largeTextStyles: TextStyle = {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.size.l,
    lineHeight: typography.lineHeight.m
  }

  // - Variant Styles -
  const defaultVariantStyles = {
    default: {
      text: color.text.default
    },
    press: {
      text: color.secondary.s500
    }
  }

  const subduedStyles = {
    default: {
      text: color.text.subdued
    },
    press: {
      text: color.secondary.s500
    }
  }

  const invertedStyles = {
    default: {
      text: color.static.staticWhite
    },
    press: {
      text: color.static.staticWhite
    }
  }

  const dynamicStyles =
    variant === 'subdued'
      ? subduedStyles
      : variant === 'inverted'
        ? invertedStyles
        : defaultVariantStyles

  const buttonStyles = {
    ...(isDisabled && { opacity: 0.2 }),
    ...(size === 'large' ? largeStyles : defaultStyles)
  }

  const animatedButtonStyles = useAnimatedStyle(
    () => ({
      ...(isPressable &&
        variant === 'inverted' && {
          opacity: interpolate(pressed.value, [0, 1], [1, 0.5])
        })
    }),
    [variant, Boolean(isPressable)]
  )

  const animatedIconProps = useAnimatedProps(
    () => ({
      fill: interpolateColor(
        pressed.value,
        [0, 1],
        [dynamicStyles.default.text, dynamicStyles.press.text]
      )
    }),
    [variant, typeof type === 'string' ? type : 'default-light'],
    animatedPropAdapter
  )

  // Non-animated version for Android
  const staticIconProps = {
    fill: dynamicStyles.default.text
  }

  const textCss: TextStyle = useAnimatedStyle(
    () => ({
      ...(isPressable && {
        color: interpolateColor(
          pressed.value,
          [0, 1],
          [dynamicStyles.default.text, dynamicStyles.press.text]
        )
      }),

      ...(size === 'large' ? largeTextStyles : defaultTextStyles)
    }),
    [
      size,
      Boolean(isPressable),
      typeof type === 'string' ? type : 'default-light'
    ]
  )

  return (
    <BaseButton
      sharedValue={pressed}
      style={[buttonStyles, animatedButtonStyles]}
      styles={{
        text: styles?.text ?? textCss,
        icon: styles?.icon
      }}
      innerProps={{
        icon:
          Platform.OS === 'android'
            ? {
                ...staticIconProps,
                size: size === 'large' ? 'm' : 's'
              }
            : {
                animatedProps: animatedIconProps,
                size: size === 'large' ? 'm' : 's'
              }
      }}
      {...baseProps}
    />
  )
}
