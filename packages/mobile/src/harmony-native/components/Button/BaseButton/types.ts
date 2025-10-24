import type { ReactNode } from 'react'

import type {
  PressableProps,
  StyleProp,
  TextStyle,
  ViewProps
} from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

import type { LoadingSpinnerProps } from 'app/components/loading-spinner/LoadingSpinner'
import type { IconComponent, IconProps } from 'app/harmony-native/icons'

import type { TextProps } from '../../Text/Text'

type BaseButtonStyles = {
  text?: StyleProp<TextStyle>
  icon?: IconProps['style']
}

type BaseButtonInnerProps = {
  button?: ViewProps
  text?: TextProps
  icon?: IconProps
  loader?: LoadingSpinnerProps
}

export type BaseButtonProps = {
  /**
   * Optional icon element to include on the left side of the button
   */
  iconLeft?: IconComponent

  /**
   * Optional icon element to include on the right side of the button
   */
  iconRight?: IconComponent

  /**
   * When true, do not override icon's fill colors
   */
  isStaticIcon?: boolean

  /**
   * Show a spinning loading state instead of the left icon
   */
  isLoading?: boolean

  /**
   * The max width at which text will still be shown
   */
  widthToHideText?: number

  /**
   * Optional min width
   * Min width can be useful if the button is switching states and you want
   * to keep a certain width while text length changes
   */
  minWidth?: number

  /**
   * If provided, allow button to take up full width of container
   */
  fullWidth?: boolean

  /**
   * Internal styles used by derived button components
   */
  styles?: BaseButtonStyles

  /**
   * Define custom gradient for the button
   */
  gradient?: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    colors: string[]
  }

  /**
   * Internal props used by derived button components
   */
  innerProps?: BaseButtonInnerProps

  /**
   * reanimated sharedValue to apply additional animated styles
   */
  sharedValue?: SharedValue<number>

  children?: ReactNode
  /**
   * The percentage to scale the button when pressed
   */
  pressScale?: number
  /**
   * When true, apply a medium haptic feedback
   */
  haptics?: boolean
} & PressableProps
