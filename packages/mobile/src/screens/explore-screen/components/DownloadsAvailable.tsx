import React, { useMemo } from 'react'

import { useSearchTrackResults, SEARCH_PAGE_SIZE } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'

import { useDeferredElement } from '../../../hooks/useDeferredElement'

import { ExploreSection } from './ExploreSection'
import { TrackTileCarousel } from './TrackTileCarousel'

export const DownloadsAvailable = () => {
  const { inView, InViewWrapper } = useDeferredElement()
  const { data, isPending, isError } = useSearchTrackResults(
    { hasDownloads: true, pageSize: SEARCH_PAGE_SIZE },
    { enabled: inView }
  )

  const tracks = useMemo(() => data?.map((item) => item.id), [data])

  if (isError || (!isPending && !tracks?.length)) {
    return null
  }

  return (
    <InViewWrapper>
      <ExploreSection title={messages.downloadsAvailable}>
        <TrackTileCarousel
          tracks={tracks}
          isLoading={isPending || !inView}
          source={QueueSource.SEARCH_TRACKS}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
