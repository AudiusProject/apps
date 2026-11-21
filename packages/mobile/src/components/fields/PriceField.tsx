import { useState, useEffect, useCallback } from 'react'

import {
  filterDecimalString,
  padDecimalValue,
  decimalIntegerToHumanReadable,
  decimalIntegerFromHumanReadable
} from '@audius/common/utils'
import { useField } from 'formik'
import type {
  NativeSyntheticEvent,
  TextInputChangeEventData,
  TextInputFocusEventData
} from 'react-native'

import type { TextFieldProps } from './TextField'
import { TextField } from './TextField'

const MAX_LENGTH = Number.MAX_SAFE_INTEGER.toString().length - 3

const messages = {
  dollars: '$'
}

export const PriceField = (props: TextFieldProps) => {
  const [{ value }, , { setValue: setPrice }] = useField<number>(props.name)
  const [humanizedValue, setHumanizedValue] = useState(
    value ? decimalIntegerToHumanReadable(value) : null
  )

  useEffect(() => {
    if (humanizedValue !== null) {
      const dehumanizedValue = decimalIntegerFromHumanReadable(humanizedValue)
      if (value === undefined || dehumanizedValue !== value) {
        setPrice(dehumanizedValue)
      }
    }
  }, [value, humanizedValue, setPrice])

  const handlePriceChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      const { human, value } = filterDecimalString(e.nativeEvent.text)
      setHumanizedValue(human)
      setPrice(value)
    },
    [setPrice, setHumanizedValue]
  )

  const handlePriceBlur = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setHumanizedValue(padDecimalValue(e.nativeEvent.text))
    },
    []
  )

  return (
    <TextField
      keyboardType='numeric'
      startAdornmentText={messages.dollars}
      maxLength={MAX_LENGTH}
      {...props}
      value={humanizedValue ?? undefined}
      onChange={handlePriceChange}
      onEndEditing={handlePriceBlur}
    />
  )
}
