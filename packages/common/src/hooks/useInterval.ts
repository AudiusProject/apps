import { useEffect, useRef } from 'react'

import { useIsomorphicLayoutEffect } from 'react-use'

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)
  const intervalId = useRef<any | undefined>(undefined)

  // Remember the latest callback if it changes.
  useIsomorphicLayoutEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    // Note: 0 is a valid value for delay.
    if (!delay && delay !== 0) {
      return
    }

    intervalId.current = setInterval(() => savedCallback.current(), delay)

    return () => clearInterval(intervalId.current)
  }, [delay])

  return intervalId.current
}
