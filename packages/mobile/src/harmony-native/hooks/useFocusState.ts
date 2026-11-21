import { useState, useCallback } from 'react'

import type { NativeSyntheticEvent } from 'react-native'

export const useFocusState = <T>(
  onFocus?: (e: NativeSyntheticEvent<T>) => void,
  onBlur?: (e: NativeSyntheticEvent<T>) => void
) => {
  const [isFocused, setIsFocused] = useState(false)
  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<T>) => {
      setIsFocused(true)
      onFocus?.(e)
    },
    [onFocus, setIsFocused]
  )
  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<T>) => {
      setIsFocused(false)
      onBlur?.(e)
    },
    [onBlur, setIsFocused]
  )

  return [isFocused, handleFocus, handleBlur] as const
}
