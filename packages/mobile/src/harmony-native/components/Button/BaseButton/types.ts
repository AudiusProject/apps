import type { ReactNode } from 'react'

import type {
  PressableProps,
  StyleProp,
  TextStyle,
  ViewProps,
  ViewStyle
} from 'react-native'
import type { AnimatedStyle, SharedValue } from 'react-native-reanimated'

import type { LoadingSpinnerProps } from 'app/components/loading-spinner/LoadingSpinner'
import type { IconComponent, IconProps } from 'app/harmony-native/icons'

import type { TextProps } from '../../Text/Text'

type BaseButtonStyles = {
  text?: StyleProp<AnimatedStyle<TextStyle>>
  icon?: IconProps['style']
}

type BaseButtonInnerProps = {
  button?: ViewProps
  text?: TextProps
  icon?: IconProps
  loader?: LoadingSpinnerProps
}

export type BaseButtonProps = {
  iconLeft?: IconComponent

  iconRight?: IconComponent

  isStaticIcon?: boolean

  isLoading?: boolean

  widthToHideText?: number

  minWidth?: number

  fullWidth?: boolean

  styles?: BaseButtonStyles

  gradient?: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    colors: string[]
  }

  innerProps?: BaseButtonInnerProps

  sharedValue?: SharedValue<number>

  children?: ReactNode
  pressScale?: number
  haptics?: boolean

  style?: StyleProp<AnimatedStyle<ViewStyle>>
} & Omit<PressableProps, 'style'>
