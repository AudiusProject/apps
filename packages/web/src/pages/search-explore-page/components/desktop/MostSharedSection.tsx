import { useMostSharedTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { full } from '@audius/sdk'

import { TrackCard, TrackCardSkeleton } from 'components/track/TrackCard'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useDeferredElement } from './useDeferredElement'

export const MostSharedSection = () => {
  const { ref, inView } = useDeferredElement()
  const { data, isLoading, isError, isSuccess } = useMostSharedTracks(
    {
      pageSize: 10,
      timeRange: full.GetMostSharedTracksTimeRangeEnum.Week
    },
    { enabled: inView }
  )
  const isMobile = useIsMobile()

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.mostShared}>
      {!inView || !data || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <TrackCardSkeleton key={i} size={isMobile ? 'xs' : 's'} noShimmer />
          ))
        : data?.map((id) => <TrackCard key={id} id={id} size='s' />)}
    </Carousel>
  )
}
