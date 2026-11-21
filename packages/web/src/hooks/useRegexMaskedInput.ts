import { ChangeEvent, useRef } from 'react'

export type UseRegexMaskedInputParams = {
  regex: RegExp
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

export const useRegexMaskedInput = (params: UseRegexMaskedInputParams) => {
  const { regex, onChange } = params
  const ref = useRef<HTMLInputElement>(null)
  const previousValidValue = useRef('')

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const value = input.value

    if (regex.test(value)) {
      previousValidValue.current = value
      onChange?.(event)
    } else {
      input.value = previousValidValue.current
    }
  }
  return {
    ref,
    onChange: handleChange
  }
}
