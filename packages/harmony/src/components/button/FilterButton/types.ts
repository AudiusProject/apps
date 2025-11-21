import { ReactNode } from 'react'

import { CSSObject } from '@emotion/react'

import { IconComponent } from '~harmony/components/icon'
import { TextInputProps } from '~harmony/components/input'
import { MenuContentProps, MenuProps } from '~harmony/components/internal/Menu'

export type FilterButtonSize = 'default' | 'small'

export type FilterButtonVariant =
  | 'fillContainer' // When a value is present, the button will be in an active state and have a remove icon (default)
  | 'replaceLabel' // Shows the value as the label of the button, but doesn't show an active state

export type FilterButtonOptionType<Value extends string> = {
  value: Value
  /**
   * The label to display. If not provided, uses the value.
   */
  label?: string
  icon?: IconComponent
  /**
   * A leading element to display before the option label. Useful for icons/emojis
   */
  leadingElement?: JSX.Element
  /**
   * A leading element to display before the filter button label
   */
  labelLeadingElement?: JSX.Element
  /**
   * Text to display after the element
   */
  helperText?: string | JSX.Element
  /**
   * Whether the option is disabled
   */
  disabled?: boolean
  /**
   * Tooltip to display when the option is disabled
   */
  disabledTooltip?: string | JSX.Element
}

type ChildrenProps<Value> = {
  /**
   * Callback when a value is selected
   */
  onChange: (value: Value) => void
  options: ReactNode
  setIsOpen: (isOpen: boolean) => void
}

export type FilterButtonProps<Value extends string = string> = {
  value?: Value | null
  /**
   * Callback when a value is selected
   */
  onChange?: (value: Value) => void
  /**
   * Selection options
   * e.g. { label: 'Option A', icon: IconRadar }
   */
  options?: FilterButtonOptionType<Value>[]
  /**
   * Children render prop. This can be used to render a dropdown component
   * for example
   */
  children?: (props: ChildrenProps<Value>) => ReactNode

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
   * The button size
   * @default FilterButtonSize.DEFAULT
   */
  size?: FilterButtonSize

  /**
   * The type of filter button
   * @default 'fillContainer'
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
   * What to do when the filter button is opened
   */
  onOpen?: () => void

  /**
   * If provided, will be called when the selected value is reset
   */
  onReset?: () => void

  /**
   * What to do when the button is clicked
   * This will override the default behavior of toggling isOpen
   */
  onClick?: () => void

  /**
   * Whether interaction is disabled
   */
  disabled?: boolean

  /**
   * Optional leading element to include on the left side of the button
   */
  leadingElement?: ReactNode

  /**
   * Show a text input to filter the options
   */
  showFilterInput?: boolean

  filterInputProps?: TextInputProps

  /**
   * Label to display above options
   */
  optionsLabel?: string

  menuProps?: Partial<MenuProps> &
    Partial<MenuContentProps> & { css?: CSSObject }

  renderLabel?: (label: string) => ReactNode
  /**
   * Whether or not to virtualize the options
   */
  virtualized?: boolean
}
