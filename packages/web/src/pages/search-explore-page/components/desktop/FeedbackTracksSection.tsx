import { useFeedbackTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useExploreSectionTracking } from './useExploreSectionTracking'

export const FeedbackTracksSection = () => {
  const { ref, inView } = useExploreSectionTracking('Looking for Feedback')
  const { trackIds, isLoading, isError, isSuccess } = useFeedbackTracks(
    { pageSize: 20 },
    { enabled: inView }
  )

  if (isError || (isSuccess && trackIds.length === 0)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.lookingForFeedback}>
      {!inView || isLoading || !trackIds.length ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={trackIds} />
      )}
    </Carousel>
  )
}
