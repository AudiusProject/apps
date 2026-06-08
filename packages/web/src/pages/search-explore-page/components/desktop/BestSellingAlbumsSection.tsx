import { useBestSellingAlbums } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { CollectionCard, CollectionCardSkeleton } from 'components/collection'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useExploreSectionTracking } from './useExploreSectionTracking'

export const BestSellingAlbumsSection = () => {
  const { ref, inView } = useExploreSectionTracking('Best Selling Albums')

  const { ids, isLoading, isError, isSuccess } = useBestSellingAlbums(
    { limit: 10 },
    { enabled: inView }
  )
  const isMobile = useIsMobile()

  if (isError || (isSuccess && !ids?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.bestSellingAlbums}>
      {!inView || !ids || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <CollectionCardSkeleton
              key={i}
              size={isMobile ? 'xs' : 's'}
              noShimmer
            />
          ))
        : ids.map((id) => <CollectionCard key={id} id={id} size='s' />)}
    </Carousel>
  )
}
