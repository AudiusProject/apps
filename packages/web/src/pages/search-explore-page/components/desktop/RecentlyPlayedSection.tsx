import { useRecentlyPlayedTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { TrackCard, TrackCardSkeleton } from 'components/track/TrackCard'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useDeferredElement } from './useDeferredElement'

export const RecentlyPlayedSection = () => {
  const { ref, inView } = useDeferredElement()
  const { data, isLoading, isError, isSuccess } = useRecentlyPlayedTracks(
    { pageSize: 10 },
    { enabled: inView }
  )
  const isMobile = useIsMobile()

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.recentlyPlayed} viewAllLink='/history'>
      {!inView || !data || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <TrackCardSkeleton key={i} size={isMobile ? 'xs' : 's'} noShimmer />
          ))
        : data?.map((id) => <TrackCard key={id} id={id} size='s' />)}
    </Carousel>
  )
}
