import { TimeRange } from '@audius/common/models'
import { trendingPageSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { TrendingLineup } from './TrendingLineup'

const { getTrendingTimeRange } = trendingPageSelectors

export const TrendingTracksLineup = () => {
  const timeRange = useSelector(getTrendingTimeRange) ?? TimeRange.WEEK

  return <TrendingLineup timeRange={timeRange} rankIconCount={5} />
}
