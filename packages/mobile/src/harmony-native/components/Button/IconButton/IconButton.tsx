import { useCallback } from 'react'

import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'

import { DEFAULT_HIT_SLOP } from 'app/harmony-native/constants'
import { useTheme } from 'app/harmony-native/foundations/theme'
import type { IconComponent, IconProps } from 'app/harmony-native/icons'
import { useToast } from 'app/hooks/useToast'

import { BaseButton } from '../BaseButton/BaseButton'
import type { BaseButtonProps } from '../BaseButton/types'

export type IconButtonProps = {
  icon: IconComponent
  ripple?: boolean
  style?: StyleProp<ViewStyle>
  disabledHint?: string
  iconStyle?: StyleProp<ViewStyle>
} & Pick<IconProps, 'color' | 'size' | 'shadow'> &
  Omit<BaseButtonProps, 'fill' | 'styles'> &
  (
    | {
        accessibilityLabel?: string
      }
    // TODO: make arial-label or accessibilityLabel required
    | { 'aria-label'?: string }
  )

export const IconButton = (props: IconButtonProps) => {
  const {
    icon: Icon,
    color: iconColor = 'default',
    size = 'l',
    shadow,
    ripple,
    style,
    onPress,
    disabled,
    disabledHint,
    iconStyle,
    ...other
  } = props
  const pressed = useSharedValue(0)
  const { color, spacing, type } = useTheme()
  const { toast } = useToast()

  const buttonStyles = {
    borderRadius: 1000,
    padding: spacing.xs,
    overflow: 'visible' as const
  }

  const rippleStyles = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        pressed.value,
        [0, 1],
        ['transparent', color.neutral.n150]
      )
    }),
    [type]
  )

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) {
        onPress?.(e)
      } else if (disabledHint) {
        toast({ content: disabledHint })
      }
    },
    [disabled, disabledHint, onPress, toast]
  )

  return (
    <BaseButton
      {...other}
      style={[buttonStyles, ripple ? rippleStyles : undefined, style]}
      sharedValue={pressed}
      onPress={handlePress}
      disabled={disabled && !disabledHint}
      pressScale={0.9}
      hitSlop={DEFAULT_HIT_SLOP}
    >
      <Icon
        color={disabled ? 'disabled' : iconColor}
        size={size}
        shadow={shadow}
        style={iconStyle}
      />
    </BaseButton>
  )
}
