import { useFeed } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { EntityType } from '@audius/sdk'

import { CollectionCard } from 'components/collection'
import { TrackCard, TrackCardSkeleton } from 'components/track/TrackCard'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from '../../search-explore-page/components/desktop/Carousel'

const PAGE_SIZE = 10
const SKELETON_COUNT = 6

const messages = {
  title: 'Recent from People You Follow'
}

export const FromPeopleYouFollowSection = () => {
  const isMobile = useIsMobile()
  const { data, isLoading, isError, isSuccess } = useFeed({
    initialPageSize: PAGE_SIZE
  })

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel title={messages.title} viewAllLink={route.FEED_PAGE}>
      {isLoading || !data
        ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <TrackCardSkeleton key={i} size={isMobile ? 'xs' : 's'} noShimmer />
          ))
        : data
            .slice(0, PAGE_SIZE)
            .map(({ id, type }) =>
              type === EntityType.TRACK ? (
                <TrackCard key={`t-${id}`} id={id} size='s' />
              ) : (
                <CollectionCard key={`c-${id}`} id={id} size='s' />
              )
            )}
    </Carousel>
  )
}
