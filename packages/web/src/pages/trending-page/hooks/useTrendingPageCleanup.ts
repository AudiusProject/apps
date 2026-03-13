import { useEffect, useRef } from 'react'

import { TimeRange } from '@audius/common/models'

import { TrendingActionsReturn, TrendingPageHookReturn } from '../providerTypes'

interface UseTrendingPageCleanupProps {
  trendingPageState: TrendingPageHookReturn
  actions: TrendingActionsReturn
}

/**
 * Hook that handles component lifecycle cleanup for the trending page
 */
export const useTrendingPageCleanup = ({
  trendingPageState,
  actions
}: UseTrendingPageCleanupProps): void => {
  const { isMobile, hasAccount } = trendingPageState
  const { resetTrendingLineup, makeResetTrending } = actions
  const hasAccountRef = useRef(hasAccount)
  hasAccountRef.current = hasAccount

  // Cleanup on unmount only. Use ref for hasAccount so we read current value
  // at unmount time and avoid resetting when hasAccount flips after sign-in.
  useEffect(() => {
    return () => {
      const currentHasAccount = hasAccountRef.current
      // Only reset if we're not on mobile (mobile should
      // preserve the current tab + state) or there was no
      // account (because the lineups could contain stale content).
      if (!isMobile || !currentHasAccount) {
        resetTrendingLineup()
        makeResetTrending(TimeRange.WEEK)()
        makeResetTrending(TimeRange.MONTH)()
        makeResetTrending(TimeRange.ALL_TIME)()
      }
    }
  }, [isMobile, resetTrendingLineup, makeResetTrending])
}
