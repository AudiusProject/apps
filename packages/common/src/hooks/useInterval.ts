import { useEffect, useRef } from 'react'

import { useIsomorphicLayoutEffect } from 'react-use'

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)
  const intervalId = useRef<any | undefined>(undefined)

  useIsomorphicLayoutEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!delay && delay !== 0) {
      return
    }

    intervalId.current = setInterval(() => savedCallback.current(), delay)

    return () => clearInterval(intervalId.current)
  }, [delay])

  return intervalId.current
}
