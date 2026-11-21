import { useRef, useCallback } from 'react'

export const useInstanceVar = <T>(
  initial: T
): [() => T, (updated: T | ((old: T) => T)) => void] => {
  const ref = useRef<T>(initial)

  const getter = useCallback(() => ref.current, [ref])

  const setter = useCallback(
    (updated: T | ((old: T) => T)) => {
      if (typeof updated === 'function') {
        ref.current = (updated as (old: T) => T)(ref.current)
      } else {
        ref.current = updated
      }
    },
    [ref]
  )

  return [getter, setter]
}
