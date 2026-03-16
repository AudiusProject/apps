import { useRecommendedTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { GetRecommendedTracksTimeEnum } from '@audius/sdk/services'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useExploreSectionTracking } from './useExploreSectionTracking'

export const RecommendedTracksSection = () => {
  const { ref, inView } = useExploreSectionTracking('Recommended Tracks')
  const { data, isLoading, isError, isSuccess } = useRecommendedTracks(
    {
      pageSize: 10,
      timeRange: GetRecommendedTracksTimeEnum.Week
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
