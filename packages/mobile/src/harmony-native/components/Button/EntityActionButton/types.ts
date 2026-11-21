import type { StyleProp, ViewStyle } from 'react-native'

import type { IconComponent, IconProps } from 'app/harmony-native/icons'

import type { BaseButtonProps } from '../BaseButton/types'

export type EntityActionButtonProps = {
  isActive?: boolean

  onPress?: () => void

  iconLeft?: IconComponent

  iconRight?: IconComponent

  icon?: IconProps

  style?: StyleProp<ViewStyle>
} & Omit<BaseButtonProps, 'styles'>
