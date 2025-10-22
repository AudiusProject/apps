import { useRecentPremiumTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useDeferredElement } from './useDeferredElement'

export const RecentPremiumTracksSection = () => {
  const { ref, inView } = useDeferredElement()
  const { data, isLoading, isError, isSuccess } = useRecentPremiumTracks(
    { pageSize: 10 },
    { enabled: inView }
  )

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.recentlyListedForSale}>
      {!inView || isLoading || !data ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={data} />
      )}
    </Carousel>
  )
}
