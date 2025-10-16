import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import {
  RemixContestCard,
  RemixContestCardSkeleton
} from 'components/remix-contest-card'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useDeferredElement } from './useDeferredElement'

export const FeaturedRemixContestsSection = () => {
  const { ref, inView } = useDeferredElement()

  const { data, isLoading, isError, isSuccess } = useExploreContent({
    enabled: inView
  })
  const isMobile = useIsMobile()

  if (isError || (isSuccess && !data?.featuredRemixContests?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.featuredRemixContests}>
      {!inView || !data?.featuredRemixContests || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <RemixContestCardSkeleton
              key={i}
              size={isMobile ? 'xs' : 's'}
              noShimmer
            />
          ))
        : data?.featuredRemixContests?.map((id) => (
            <RemixContestCard key={id} id={id} size='s' />
          ))}
    </Carousel>
  )
}
