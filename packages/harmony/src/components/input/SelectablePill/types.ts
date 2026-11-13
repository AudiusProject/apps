import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import type { IconComponent } from '../../icon'

type InternalProps = {
  /**
   * @ignore: This prop is for internal use only
   */
  _isHovered?: boolean
}

type BaseProps = {
  // Note: oversized should only be used in specific circumstances. Use with caution.
  size?: 'small' | 'large' | 'oversized'
  isSelected?: boolean
  disabled?: boolean
  icon?: IconComponent
  /** Rendered inside the pill after the label, e.g. an unread dot. */
  endAdornment?: ReactNode
}

type LabelProps =
  | { label: string }
  | { icon: IconComponent; 'aria-label': string }

type InputProps =
  | ({
      type: 'checkbox' | 'radio'
    } & Omit<ComponentPropsWithoutRef<'input'>, 'children' | 'size'>)
  | ({
      type?: 'button' | 'submit' | 'reset' | undefined
    } & Omit<ComponentPropsWithoutRef<'button'>, 'children'>)

export type SelectablePillProps = BaseProps &
  LabelProps &
  InternalProps &
  InputProps
