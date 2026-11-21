import type { BaseButtonProps } from '../BaseButton/types'

export type PlainButtonVariant = 'default' | 'subdued' | 'inverted'

export type PlainButtonSize = 'default' | 'large'

export type PlainButtonProps = {
  variant?: PlainButtonVariant

  size?: PlainButtonSize
} & BaseButtonProps
