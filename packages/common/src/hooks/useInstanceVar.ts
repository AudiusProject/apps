import { useRef, useCallback } from 'react'

/**
 * `useInstanceVar` is a more ergonomic API around `useRef`. If you don't need the actual
 * ref object (e.g. you just want some mutable state that won't trigger a re-render,
 *  as opposted to requiring a DOM ref), `useInstanceVar` may result in simpler calling code.
 *
 * Like useState, it returns a tuple of type [`currentValue`, `setterFunction`]
 * Like useState, `setterFunction` can either take an updated value
 * or an updater function to derive a new state from the previous state.
 */
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
