import { useMemo, useState } from 'react'

import { debounce } from 'lodash'

const DEFAULT_DEBOUNCE_TIME = 500

export function useStateDebounced<T>(
  initialValue: T,
  time: number = DEFAULT_DEBOUNCE_TIME
) {
  const [value, setValue] = useState(initialValue)
  const setValueDebounced = useMemo(
    () => debounce(setValue, time),
    [setValue, time]
  )
  return [value, setValueDebounced] as const
}
