import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { UserCard, UserCardSkeleton } from 'components/user-card'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useDeferredElement } from './useDeferredElement'

export const LabelSpotlightSection = () => {
  const { ref, inView } = useDeferredElement()
  const { data, isLoading, isError, isSuccess } = useExploreContent({
    enabled: inView
  })
  const isMobile = useIsMobile()

  if (isError || (isSuccess && !data?.featuredLabels?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.labelSpotlight}>
      {!inView || !data?.featuredLabels || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <UserCardSkeleton key={i} size={isMobile ? 'xs' : 's'} noShimmer />
          ))
        : data?.featuredLabels?.map((id) => (
            <UserCard key={id} id={id} size='s' />
          ))}
    </Carousel>
  )
}
