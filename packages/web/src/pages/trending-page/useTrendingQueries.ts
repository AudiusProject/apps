import { useCallback, useState } from 'react'

import {
  GetTrendingArgs,
  useTrending,
  useTrendingUnderground
} from '@audius/common/api'
import { TimeRange } from '@audius/common/models'

type UseTrendingQueriesArgs = {
  trendingArgs: Omit<GetTrendingArgs, 'timeRange'>
  timeRange: TimeRange
  isUndergroundVisible: boolean
  undergroundPageSize: number
}

export const useTrendingQueries = ({
  trendingArgs,
  timeRange,
  isUndergroundVisible,
  undergroundPageSize
}: UseTrendingQueriesArgs) => {
  const [shouldPrefetchTimeRanges, setShouldPrefetchTimeRanges] =
    useState(false)
  const [shouldPrefetchUnderground, setShouldPrefetchUnderground] =
    useState(false)

  const isTimeRangeEnabled = (tr: TimeRange) =>
    tr === timeRange || shouldPrefetchTimeRanges

  const weekQuery = useTrending(
    { timeRange: TimeRange.WEEK, ...trendingArgs },
    { enabled: isTimeRangeEnabled(TimeRange.WEEK) }
  )
  const monthQuery = useTrending(
    { timeRange: TimeRange.MONTH, ...trendingArgs },
    { enabled: isTimeRangeEnabled(TimeRange.MONTH) }
  )
  const allTimeQuery = useTrending(
    { timeRange: TimeRange.ALL_TIME, ...trendingArgs },
    { enabled: isTimeRangeEnabled(TimeRange.ALL_TIME) }
  )
  const undergroundQuery = useTrendingUnderground(
    { pageSize: undergroundPageSize },
    { enabled: isUndergroundVisible || shouldPrefetchUnderground }
  )

  const prefetchTimeRanges = useCallback(
    () => setShouldPrefetchTimeRanges(true),
    []
  )
  const prefetchUnderground = useCallback(
    () => setShouldPrefetchUnderground(true),
    []
  )

  return {
    weekQuery,
    monthQuery,
    allTimeQuery,
    undergroundQuery,
    prefetchTimeRanges,
    prefetchUnderground
  }
}
