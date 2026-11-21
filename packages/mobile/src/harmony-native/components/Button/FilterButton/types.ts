import type { ComponentType, ReactElement, ReactNode } from 'react'

import type { Maybe } from '@audius/common/utils'
import type { GestureResponderEvent } from 'react-native'

import type { IconComponent } from '@audius/harmony-native'

export type FilterButtonSize = 'default' | 'small'
export type FilterButtonVariant = 'fillContainer' | 'replaceLabel'

export type FilterButtonOption = {
  value: string
  label?: string
  icon?: IconComponent
}

export type FilterButtonOptionType<Value extends string> = {
  value: Value
  label?: string
  helperText?: string
  icon?: IconComponent
  leadingElement?: ReactElement
  labelLeadingElement?: ReactElement
}

export type ScreenProps<Value> = {
  onChange: (value: Maybe<Value>) => void
  onSubmit: () => void
  value: Maybe<Value>
}

export type FilterButtonProps<Value extends string = string> = {
  options?: FilterButtonOptionType<Value>[]

  label?: string

  'aria-label'?: string

  value?: string | null

  size?: FilterButtonSize

  variant?: FilterButtonVariant

  iconLeft?: IconComponent

  iconRight?: IconComponent | null

  onChange?: (value: Value | undefined) => void

  filterScreen?: string

  onOpen?: () => void

  onReset?: () => void

  onPress?: (e: GestureResponderEvent) => void

  disabled?: boolean

  leadingElement?: ReactNode
  screen?: ComponentType<ScreenProps<Value>>
  renderLabel?: (label: string) => ReactNode

  disableSearch?: boolean
}
