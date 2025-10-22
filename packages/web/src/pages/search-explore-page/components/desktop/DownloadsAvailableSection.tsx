import { useMemo } from 'react'

import { useSearchTrackResults, SEARCH_PAGE_SIZE } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useDeferredElement } from './useDeferredElement'

export const DownloadsAvailableSection = () => {
  const { ref, inView } = useDeferredElement()
  const {
    data: lineupData,
    isLoading,
    isError,
    isSuccess
  } = useSearchTrackResults(
    // Use the same page size as search so that we cache hit when user clicks View All
    { hasDownloads: true, pageSize: SEARCH_PAGE_SIZE },
    {
      enabled: inView
    }
  )

  const data = useMemo(() => {
    return lineupData?.map((item) => item.id)
  }, [lineupData])

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel
      ref={ref}
      title={messages.downloadsAvailable}
      viewAllLink='/search/tracks?hasDownloads=true'
    >
      {!inView || isLoading || !data ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs data={data} source={QueueSource.SEARCH_TRACKS} />
      )}
    </Carousel>
  )
}
