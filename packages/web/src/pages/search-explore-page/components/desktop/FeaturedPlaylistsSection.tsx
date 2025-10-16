import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { CollectionCard, CollectionCardSkeleton } from 'components/collection'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import { useDeferredElement } from './useDeferredElement'

export const FeaturedPlaylistsSection = () => {
  const { ref, inView } = useDeferredElement()

  const { data, isLoading, isError, isSuccess } = useExploreContent({
    enabled: inView
  })
  const isMobile = useIsMobile()

  if (isError || (isSuccess && !data?.featuredPlaylists?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.featuredPlaylists}>
      {!inView || !data?.featuredPlaylists || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <CollectionCardSkeleton
              key={i}
              size={isMobile ? 'xs' : 's'}
              noShimmer
            />
          ))
        : data?.featuredPlaylists?.map((id) => (
            <CollectionCard key={id} id={id} size='s' />
          ))}
    </Carousel>
  )
}
