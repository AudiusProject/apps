import type { ComponentType, ReactElement, ReactNode } from 'react'

import type { Maybe } from '@audius/common/utils'
import type { GestureResponderEvent } from 'react-native'

import type { IconComponent } from '@audius/harmony-native'

export type FilterButtonSize = 'default' | 'small'
export type FilterButtonVariant = 'fillContainer' | 'replaceLabel'

export type FilterButtonOption = {
  value: string
  /** The label to display. If not provided, uses the value. */
  label?: string
  icon?: IconComponent
}

export type FilterButtonOptionType<Value extends string> = {
  value: Value
  /**
   * The label to display. If not provided, uses the value.
   */
  label?: string
  helperText?: string
  icon?: IconComponent
  /**
   * A leading element to display before the option label. Useful for icons/emojis
   */
  leadingElement?: ReactElement
  /**
   * A leading element to display before the filter button label
   */
  labelLeadingElement?: ReactElement
}

export type ScreenProps<Value> = {
  /**
   * A function to handle when the value is changed
   */
  onChange: (value: Maybe<Value>) => void
  onSubmit: () => void
  value: Maybe<Value>
}

export type FilterButtonProps<Value extends string = string> = {
  /**
   * Selection options
   * e.g. { label: 'Option A', icon: IconRadar }
   */
  options?: FilterButtonOptionType<Value>[]

  /**
   * The text that appears on the button component.
   * If no label is provided, a different Icon can be specified
   * to contextually inform users.
   */
  label?: string

  /**
   * If no label is provided, specify an optional aria-label
   */
  'aria-label'?: string

  /**
   * The value
   */
  value?: string | null

  /**
   * The button size
   * @default FilterButtonSize.DEFAULT
   */
  size?: FilterButtonSize

  /**
   * The type of filter button
   * @default FilterButtonType.FILL_CONTAINER
   */
  variant?: FilterButtonVariant

  /**
   * Optional icon element to include on the left side of the button
   */
  iconLeft?: IconComponent

  /**
   * Optional icon element to include on the right side of the button
   */
  iconRight?: IconComponent | null

  /**
   * What to do when the value is changed
   */
  onChange?: (value: Value | undefined) => void

  /**
   * Optional screen name to open when filter button pressed
   */
  filterScreen?: string

  /**
   * What to do when the filter button is opened
   */
  onOpen?: () => void

  /**
   * If provided, will be called when the selected value is reset
   */
  onReset?: () => void

  /**
   * What to do when the button is pressed
   * This will override the default behavior of toggling isOpen
   */
  onPress?: (e: GestureResponderEvent) => void

  /**
   * Whether interaction is disabled
   */
  disabled?: boolean

  /**
   * Optional leading element to include on the left side of the button
   */

  leadingElement?: ReactNode
  /**
   * When provided, render the screen instead of the default list selection screen
   */
  screen?: ComponentType<ScreenProps<Value>>
  renderLabel?: (label: string) => ReactNode
}
