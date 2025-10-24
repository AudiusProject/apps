import { useRecommendedTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { full } from '@audius/sdk'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useDeferredElement } from './useDeferredElement'

export const RecommendedTracksSection = () => {
  const { ref, inView } = useDeferredElement()
  const { data, isLoading, isError, isSuccess } = useRecommendedTracks(
    {
      pageSize: 10,
      timeRange: full.GetRecommendedTracksTimeEnum.Week
    },
    {
      enabled: inView
    }
  )

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.forYou}>
      {!inView || isLoading || !data ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={data} />
      )}
    </Carousel>
  )
}
