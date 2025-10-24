import { useRecentlyCommentedTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useDeferredElement } from './useDeferredElement'

export const ActiveDiscussionsSection = () => {
  const { ref, inView } = useDeferredElement()

  const { data, isLoading, isError, isSuccess } = useRecentlyCommentedTracks(
    { pageSize: 10 },
    { enabled: inView }
  )

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.activeDiscussions}>
      {!inView || isLoading || !data ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={data} />
      )}
    </Carousel>
  )
}
