import type { StyleProp, ViewStyle } from 'react-native'

import type { SpecialColors } from '@audius/harmony-native'

import type { BaseButtonProps } from '../BaseButton/types'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

export type ButtonSize = 'xs' | 'small' | 'default'
export type HexColor = `#${string}`

export type ButtonProps = {
  color?: Exclude<SpecialColors, 'gradient'>

  hexColor?: HexColor

  variant?: ButtonVariant

  size?: ButtonSize

  rounded?: boolean

  style?: StyleProp<ViewStyle>
} & Omit<BaseButtonProps, 'styles'>
