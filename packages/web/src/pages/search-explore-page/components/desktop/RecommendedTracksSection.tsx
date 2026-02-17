import { useCallback } from 'react'

import { useRecommendedTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import {
  playbackActions,
  getCurrentTrackId,
  getLineupId,
  getIsPlaying
} from '@audius/common/store'
import { full } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'

import { Carousel } from './Carousel'
import { TilePairs, TileSkeletons } from './TileHelpers'
import { useExploreSectionTracking } from './useExploreSectionTracking'

const LINEUP_ID = 'explore:for-you'

export const RecommendedTracksSection = () => {
  const { ref, inView } = useExploreSectionTracking('Recommended Tracks')
  const { data, isLoading, isError, isSuccess } = useRecommendedTracks(
    {
      pageSize: 10,
      timeRange: full.GetRecommendedTracksTimeEnum.Week
    },
    {
      enabled: inView
    }
  )

  const dispatch = useDispatch()
  const currentTrackId = useSelector(getCurrentTrackId)
  const currentLineupId = useSelector(getLineupId)
  const isPlaying = useSelector(getIsPlaying)

  const handlePlay = useCallback(
    (trackId: number) => {
      if (
        currentLineupId === LINEUP_ID &&
        currentTrackId === trackId &&
        isPlaying
      ) {
        // Already playing this track, pause
        dispatch(playbackActions.pause({}))
      } else {
        // Play this track from the lineup
        dispatch(playbackActions.play({ lineupId: LINEUP_ID, trackId }))
      }
    },
    [dispatch, currentLineupId, currentTrackId, isPlaying]
  )

  if (isError || (isSuccess && !data?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.forYou}>
      {!inView || isLoading || !data ? (
        <TileSkeletons noShimmer />
      ) : (
        <TilePairs
          data={data}
          onPlay={handlePlay}
          currentTrackId={currentTrackId}
          currentLineupId={currentLineupId}
          isPlaying={isPlaying}
          lineupId={LINEUP_ID}
        />
      )}
    </Carousel>
  )
}
