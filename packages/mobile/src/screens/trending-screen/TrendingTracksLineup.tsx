import { TimeRange } from '@audius/common/models'
import { trendingPageSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import type { LineupProps } from 'app/components/lineup/types'

import { TrendingLineup } from './TrendingLineup'

const { getTrendingTimeRange } = trendingPageSelectors

type TrendingTracksLineupProps = {
  header?: LineupProps['header']
}

export const TrendingTracksLineup = ({ header }: TrendingTracksLineupProps) => {
  const timeRange = useSelector(getTrendingTimeRange) ?? TimeRange.WEEK

  return (
    <TrendingLineup timeRange={timeRange} rankIconCount={5} header={header} />
  )
}
