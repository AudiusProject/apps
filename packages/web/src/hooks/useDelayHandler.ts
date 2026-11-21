import { useState } from 'react'

import { isEqual } from 'lodash'

const useDelayHandler = <T>(
  delay: number,
  handler: (...args: any[]) => void,
  injectedProps: T
) => {
  const [allowOverwrite, setAllowOverwrite] = useState(true)
  const [overwrittenValues, setOverwrittenValues] = useState<T>(injectedProps)

  if (allowOverwrite && !isEqual(overwrittenValues, injectedProps))
    setOverwrittenValues(injectedProps)

  return {
    delayedHandler: (newState: Partial<T>, ...args: any) => {
      setAllowOverwrite(false)
      setOverwrittenValues((v) => ({ ...v, ...newState }))
      setTimeout(() => {
        handler(...args)
        setAllowOverwrite(true)
      }, delay)
    },
    computedState: overwrittenValues
  }
}

export default useDelayHandler
