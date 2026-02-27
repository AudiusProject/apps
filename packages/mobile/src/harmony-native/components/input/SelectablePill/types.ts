import type { PressableProps, ViewProps } from 'react-native'

import type { IconComponent } from 'app/harmony-native/icons'

type BaseSelectablePillProps = {
  type: 'button' | 'checkbox' | 'radio'
  size?: 'small' | 'large'
  isSelected?: boolean
  isControlled?: boolean
  value?: string
  icon?: IconComponent
  onChange?: (value: string, isSelected?: boolean) => void
  fullWidth?: boolean
  disableUnselectAnimation?: boolean
  'aria-label'?: string
  accessibilityLabel?: string
} & Pick<PressableProps, 'disabled' | 'onPress'> &
  ViewProps

export type SelectablePillProps = BaseSelectablePillProps &
  ({ label: string } | { icon: IconComponent })
