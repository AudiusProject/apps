import { useMemo } from 'react'

import {
  FEED_PAGE,
  TRENDING_PAGE,
  LIBRARY_PAGE,
  EXPLORE_PAGE
} from '@audius/common/src/utils/route'
import { playbackSelectors, QueueSource } from '@audius/common/store'
import { useSelector } from 'react-redux'

const {
  getTrackId,
  getPlaying,
  getCurrentSource: getSource
} = playbackSelectors

/**
 * Hook to determine if the currently playing track is from a specific navigation source
 * (trending, feed, library, explore, etc)
 *
 * @returns {string | null} - returns the route of the currently playing track
 */
export const useNavSourcePlayingStatus = () => {
  const currentTrackId = useSelector(getTrackId)
  const isPlaying = useSelector(getPlaying)
  const queueSource = useSelector(getSource)

  return useMemo(() => {
    if (!currentTrackId || !isPlaying) return null

    switch (queueSource) {
      case QueueSource.DISCOVER_FEED:
        return FEED_PAGE
      case QueueSource.DISCOVER_TRENDING:
      case QueueSource.DISCOVER_TRENDING_WEEK:
      case QueueSource.DISCOVER_TRENDING_MONTH:
      case QueueSource.DISCOVER_TRENDING_ALL_TIME:
        return TRENDING_PAGE
      case QueueSource.EXPLORE_PREMIUM_TRACKS:
        return EXPLORE_PAGE
      case QueueSource.SAVED_TRACKS:
        return LIBRARY_PAGE
      default:
        return null
    }
  }, [currentTrackId, isPlaying, queueSource])
}
