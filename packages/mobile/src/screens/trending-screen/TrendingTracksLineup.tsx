import { TimeRange } from '@audius/common/models'
import { trendingPageSelectors } from '@audius/common/store'
import type { SectionListProps } from 'react-native'
import { useSelector } from 'react-redux'

import { TrendingLineup } from './TrendingLineup'

const { getTrendingTimeRange } = trendingPageSelectors

type TrendingTracksLineupProps = {
  header?: SectionListProps<unknown>['ListHeaderComponent']
}

export const TrendingTracksLineup = ({ header }: TrendingTracksLineupProps) => {
  const timeRange = useSelector(getTrendingTimeRange) ?? TimeRange.WEEK

  return (
    <TrendingLineup timeRange={timeRange} rankIconCount={5} header={header} />
  )
}
