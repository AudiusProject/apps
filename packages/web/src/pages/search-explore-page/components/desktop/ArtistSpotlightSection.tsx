import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { UserCard, UserCardSkeleton } from 'components/user-card'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useDeferredElement } from './useDeferredElement'

export const ArtistSpotlightSection = () => {
  const { ref, inView } = useDeferredElement()
  const { data, isLoading, isError, isSuccess } = useExploreContent({
    enabled: inView
  })
  const isMobile = useIsMobile()

  if (isError || (isSuccess && !data?.featuredProfiles?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.artistSpotlight}>
      {!inView || !data?.featuredProfiles || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <UserCardSkeleton key={i} size={isMobile ? 'xs' : 's'} noShimmer />
          ))
        : data?.featuredProfiles?.map((id) => (
            <UserCard key={id} id={id} size='s' />
          ))}
    </Carousel>
  )
}
