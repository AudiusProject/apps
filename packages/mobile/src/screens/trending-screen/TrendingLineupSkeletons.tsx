import {
  TRENDING_INITIAL_PAGE_SIZE,
  TRENDING_LOAD_MORE_PAGE_SIZE
} from '@audius/common/api'

import { TrackLineup } from 'app/components/lineup/TrackLineup'

/**
 * Skeleton placeholder used by ScreenSecondaryContent on the Trending screen
 * during the deferred-render window. Rendering TrackLineup with empty trackIds
 * + isPending guarantees the skeleton tiles match the loaded lineup exactly
 * (same SectionList row, same item wrapper, same LineupTileSkeleton sizing).
 */
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
