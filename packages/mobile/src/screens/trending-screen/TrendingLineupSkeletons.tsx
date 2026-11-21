import {
  TRENDING_INITIAL_PAGE_SIZE,
  TRENDING_LOAD_MORE_PAGE_SIZE
} from '@audius/common/api'

import { TrackLineup } from 'app/components/lineup/TrackLineup'

export const TrendingLineupSkeletons = () => (
  <TrackLineup
    trackIds={[]}
    source='DISCOVER_TRENDING_WEEK'
    isPending
    initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
    pageSize={TRENDING_LOAD_MORE_PAGE_SIZE}
    isTrending
    rankIconCount={5}
    itemStyles={{ paddingTop: 16, paddingBottom: 0 }}
  />
)
