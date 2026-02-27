import { useFeaturedArtistCoinTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useExploreSectionTracking } from './useExploreSectionTracking'

export const ArtistCoinTracksSection = () => {
  const { ref, inView } = useExploreSectionTracking('Artist Coin Tracks')

  const {
    trackIds = [],
    isPending,
    isError
  } = useFeaturedArtistCoinTracks({ enabled: inView })

  if (isError || (!isPending && !trackIds?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.artistCoinExclusives}>
      {!inView || isPending ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={trackIds} />
      )}
    </Carousel>
  )
}
