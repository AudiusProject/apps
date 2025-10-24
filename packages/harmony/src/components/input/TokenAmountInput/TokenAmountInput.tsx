import { ChangeEventHandler, Ref, forwardRef, useCallback } from 'react'

import { useControlled } from '~harmony/hooks/useControlled'

import { TextInput } from '../TextInput'

import { TokenAmountInputProps } from './types'

/**
 * Format a number to have commas
 */
const formatNumberCommas = (num: number | string) => {
  const parts = num.toString().split('.')
  return (
    parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    (parts[1] !== undefined ? '.' + parts[1] : '')
  )
}

export const TokenAmountInput = forwardRef(
  (props: TokenAmountInputProps, ref: Ref<HTMLInputElement>) => {
    const {
      tokenLabel,
      decimals = 0,
      isWhole = false,
      value: valueProp,
      onChange,
      endIcon,
      ...other
    } = props

    const [value, setValueState] = useControlled({
      controlledProp: valueProp ? formatNumberCommas(valueProp) : valueProp,
      defaultValue: '',
      componentName: 'TokenAmountInput'
    })

    const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
      (e) => {
        const input = e.target.value.replace(/[^0-9.]+/g, '')
        // Regex to grab the whole and decimal parts of the number, stripping duplicate '.' characters
        const match = input.match(/^(\d*)(.)?(\d*)/)
        const whole = match?.[1] || ''
        const decimal = match?.[3] || ''
        const dot = match?.[2] || ''

        // Conditionally render the decimal part, and only for the number of decimals specified
        const stringAmount =
          dot && decimals && !isWhole
            ? `${whole}.${decimal.substring(0, decimals)}`
            : whole

        // Calculate the wei amount using BigInt arithmetic instead of BN
        const wholeBigInt = BigInt(whole || '0')
        const decimalPadded = decimal
          .padEnd(decimals, '0')
          .substring(0, decimals)
        const decimalBigInt = BigInt(decimalPadded || '0')
        const multiplier = BigInt(10 ** decimals)
        const amount = wholeBigInt * multiplier + decimalBigInt

        setValueState(formatNumberCommas(stringAmount))
        if (onChange) {
          onChange(stringAmount, amount)
        }
      },
      [decimals, isWhole, setValueState, onChange]
    )
    // Determine if endIcon is an IconComponent or ReactNode
    const isIconComponent = endIcon && typeof endIcon === 'function'

    return (
      <TextInput
        ref={ref}
        {...other}
        value={value}
        onChange={handleChange}
        endAdornmentText={tokenLabel}
        endIcon={isIconComponent ? (endIcon as any) : undefined}
        endAdornment={!isIconComponent ? endIcon : undefined}
      />
    )
  }
)
