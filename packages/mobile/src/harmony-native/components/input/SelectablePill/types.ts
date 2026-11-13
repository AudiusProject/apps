import type { ReactNode } from 'react'

import type { PressableProps, ViewProps } from 'react-native'

import type { IconComponent } from 'app/harmony-native/icons'

type BaseSelectablePillProps = {
  type: 'button' | 'checkbox' | 'radio'
  size?: 'small' | 'large'
  isSelected?: boolean
  isControlled?: boolean
  value?: string
  icon?: IconComponent
  /** Rendered inside the pill after the label, e.g. an unread dot. */
  endAdornment?: ReactNode
  onChange?: (value: string, isSelected?: boolean) => void
  fullWidth?: boolean
  disableUnselectAnimation?: boolean
  'aria-label'?: string
  accessibilityLabel?: string
} & Pick<PressableProps, 'disabled' | 'onPress'> &
  ViewProps

export type SelectablePillProps = BaseSelectablePillProps &
  (
    | { label: string; icon?: IconComponent }
    | { icon: IconComponent; label?: never }
  )
