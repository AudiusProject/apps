import { useEffect, useRef } from 'react'

import { useCurrentUserId, useTrack } from '@audius/common/api'
import {
  playbackSelectors,
  playbackPositionActions
} from '@audius/common/store'
import { isLongFormContent } from '@audius/common/utils'
import { useProgress } from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'

const { getPlaying, getTrackId } = playbackSelectors
const { setTrackPosition } = playbackPositionActions

// Each setTrackPosition dispatch triggers a saga that JSON.stringify's the
// full playback position map and writes it to AsyncStorage, so we throttle
// aggressively rather than persist on every progress tick.
const SAVE_POSITION_INTERVAL_MS = 5000

export const useSavePodcastProgress = () => {
  const { position } = useProgress(SAVE_POSITION_INTERVAL_MS)
  const dispatch = useDispatch()
  const lastSavedPositionRef = useRef<number | null>(null)

  const { data: userId } = useCurrentUserId()
  const trackId = useSelector(getTrackId)
  const isPlaying = useSelector(getPlaying)
  const { data: isTrackLongFormContent } = useTrack(trackId, {
    select: (data) => isLongFormContent(data)
  })
  const isPlayingLongFormContent = isTrackLongFormContent && isPlaying

  useEffect(() => {
    lastSavedPositionRef.current = null
  }, [trackId, userId])

  useEffect(() => {
    if (!isPlayingLongFormContent || !userId || !trackId) return
    if (lastSavedPositionRef.current === position) return

    lastSavedPositionRef.current = position
    dispatch(
      setTrackPosition({
        userId,
        trackId,
        positionInfo: { status: 'IN_PROGRESS', playbackPosition: position }
      })
    )
  }, [position, isPlayingLongFormContent, userId, trackId, dispatch])
}
