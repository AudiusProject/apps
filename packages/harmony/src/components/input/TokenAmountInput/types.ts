import type { ReactNode } from 'react'

import type { IconComponent } from '../../icon'
import { TextInputProps } from '../TextInput'

export type TokenAmountInputChangeHandler = (
  value: string,
  valueBigInt: bigint
) => void

export type TokenAmountInputProps = Omit<
  TextInputProps,
  'onChange' | 'value' | 'endIcon' | 'endAdornment'
> & {
  tokenLabel?: string
  decimals?: number
  isWhole?: boolean
  value?: string
  onChange?: TokenAmountInputChangeHandler
  /**
   * Icon or component to display on the right side of the input
   */
  endIcon?: IconComponent | ReactNode
}
