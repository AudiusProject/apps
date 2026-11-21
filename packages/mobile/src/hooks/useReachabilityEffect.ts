import { useEffect, useCallback } from 'react'

import { reachabilitySelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'
import { usePrevious } from 'react-use'

type OnBecomeReachable = () => any
type OnBecomeUnreachable = () => any

const { getIsReachable } = reachabilitySelectors

export const useReachabilityEffect = (
  onBecomeReachable: OnBecomeReachable | null,
  onBecomeUnreachable: OnBecomeUnreachable | null,
  includeFirstRender = true
) => {
  const currentReachability = useSelector(getIsReachable)
  const prevReachability = usePrevious(currentReachability)

  const handleReachabilityStateChange = useCallback(
    (nextReachabilityState: boolean) => {
      const isFirstRenderRun =
        includeFirstRender && prevReachability === undefined
      const wasUnreachable = prevReachability !== undefined && !prevReachability
      const wasReachable = prevReachability !== undefined && prevReachability

      if (
        nextReachabilityState &&
        (wasUnreachable || isFirstRenderRun) &&
        onBecomeReachable
      ) {
        onBecomeReachable()
      } else if (
        !nextReachabilityState &&
        (wasReachable || isFirstRenderRun) &&
        onBecomeUnreachable
      ) {
        onBecomeUnreachable()
      }
    },
    [
      onBecomeReachable,
      onBecomeUnreachable,
      prevReachability,
      includeFirstRender
    ]
  )

  useEffect(() => {
    handleReachabilityStateChange(!!currentReachability)
  }, [currentReachability, handleReachabilityStateChange])
}

export const useReachableEffect = (
  onBecomeReachable: OnBecomeReachable,
  includeFirstRender = true
) => {
  useReachabilityEffect(onBecomeReachable, null, includeFirstRender)
}

export const useUnreachableEffect = (
  onBecomeUnreachable: OnBecomeUnreachable,
  includeFirstRender = true
) => {
  useReachabilityEffect(null, onBecomeUnreachable, includeFirstRender)
}
