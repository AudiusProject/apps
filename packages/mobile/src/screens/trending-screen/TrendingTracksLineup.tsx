import { TimeRange } from '@audius/common/models'
import { trendingPageSelectors } from '@audius/common/store'
import type { SectionListProps } from 'react-native'
import { useSelector } from 'react-redux'

import { TrendingLineup } from './TrendingLineup'

const { getTrendingTimeRange } = trendingPageSelectors

type TrendingTracksLineupProps = {
  header?: SectionListProps<unknown>['ListHeaderComponent']
  contentContainerStyle?: SectionListProps<unknown>['contentContainerStyle']
  onScroll?: SectionListProps<unknown>['onScroll']
}

export const TrendingTracksLineup = ({
  header,
  contentContainerStyle,
  onScroll
}: TrendingTracksLineupProps) => {
  const timeRange = useSelector(getTrendingTimeRange) ?? TimeRange.WEEK

  return (
    <TrendingLineup
      timeRange={timeRange}
      rankIconCount={5}
      header={header}
      contentContainerStyle={contentContainerStyle}
      onScroll={onScroll}
    />
  )
}
