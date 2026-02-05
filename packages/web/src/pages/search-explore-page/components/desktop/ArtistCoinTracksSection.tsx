import { useExploreContent } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useExploreSectionTracking } from './useExploreSectionTracking'

export const ArtistCoinTracksSection = () => {
  const { ref, inView } = useExploreSectionTracking('Artist Coin Tracks')

  const { data, isLoading, isError, isSuccess } = useExploreContent({
    enabled: inView
  })

  if (isError || (isSuccess && !data?.featuredArtistCoinTracks?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.artistCoinExclusives}>
      {!inView || isLoading || !data ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={data.featuredArtistCoinTracks} />
      )}
    </Carousel>
  )
}
