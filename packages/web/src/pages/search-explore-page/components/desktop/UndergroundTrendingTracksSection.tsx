import { useMemo } from 'react'

import { useTrendingUnderground } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { Status } from '@audius/common/models'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useDeferredElement } from './useDeferredElement'

export const UndergroundTrendingTracksSection = () => {
  const { ref, inView } = useDeferredElement()
  const {
    data: undergroundTrendingTracks,
    isLoading,
    isError,
    isSuccess,
    lineup
  } = useTrendingUnderground({ pageSize: 10 }, { enabled: inView })

  const trackIds = useMemo(() => {
    return undergroundTrendingTracks.map(({ id }) => id)
  }, [undergroundTrendingTracks])

  if (
    isError ||
    lineup.status === Status.ERROR ||
    (isSuccess &&
      lineup.status === Status.SUCCESS &&
      lineup.entries.length === 0)
  ) {
    return null
  }

  return (
    <Carousel
      ref={ref}
      title={messages.undergroundTrending}
      viewAllLink='/explore/underground'
    >
      {!inView ||
      isLoading ||
      lineup.status === Status.LOADING ||
      !trackIds.length ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={trackIds} />
      )}
    </Carousel>
  )
}
