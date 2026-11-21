import { useState, useCallback, FocusEventHandler } from 'react'

export const useFocusState = <T extends HTMLElement>(
  onFocus?: FocusEventHandler<T>,
  onBlur?: FocusEventHandler<T>
) => {
  const [isFocused, setIsFocused] = useState(false)
  const handleFocus = useCallback<FocusEventHandler<T>>(
    (e) => {
      setIsFocused(true)
      onFocus?.(e)
    },
    [onFocus, setIsFocused]
  )
  const handleBlur = useCallback<FocusEventHandler<T>>(
    (e) => {
      setIsFocused(false)
      onBlur?.(e)
    },
    [onBlur, setIsFocused]
  )

  return [isFocused, handleFocus, handleBlur] as const
}
