import { useTrendingUnderground } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useExploreSectionTracking } from './useExploreSectionTracking'

export const UndergroundTrendingTracksSection = () => {
  const { ref, inView } = useExploreSectionTracking(
    'Underground Trending Tracks'
  )
  const { trackIds, isLoading, isError, isSuccess } = useTrendingUnderground(
    { pageSize: 10 },
    { enabled: inView }
  )

  if (isError || (isSuccess && trackIds.length === 0)) {
    return null
  }

  return (
    <Carousel
      ref={ref}
      title={messages.undergroundTrending}
      viewAllLink='/explore/underground'
    >
      {!inView || isLoading || !trackIds.length ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={trackIds} />
      )}
    </Carousel>
  )
}
