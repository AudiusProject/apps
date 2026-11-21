import { useCallback, useEffect } from 'react'

import { useCurrentUserId, useTrack } from '@audius/common/api'
import {
  playbackSelectors,
  playbackPositionActions
} from '@audius/common/store'
import { isLongFormContent } from '@audius/common/utils'
import { AppState } from 'react-native'
import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents
} from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'

const { getTrackId } = playbackSelectors
const { setTrackPosition } = playbackPositionActions

const events = [
  Event.PlaybackState,
  Event.PlaybackActiveTrackChanged,
  Event.PlaybackQueueEnded
]

const TRACK_END_BUFFER = 2

export const useSavePodcastProgress = () => {
  const dispatch = useDispatch()

  const { data: userId } = useCurrentUserId()
  const trackId = useSelector(getTrackId)
  const { data: trackInfo } = useTrack(trackId, {
    select: (data) => ({
      isLongForm: isLongFormContent(data),
      duration: data?.duration
    })
  })
  const isTrackLongFormContent = trackInfo?.isLongForm
  const trackDuration = trackInfo?.duration

  const savePosition = useCallback(
    async (overridePosition?: number) => {
      if (!isTrackLongFormContent || !userId || !trackId) return
      const position =
        overridePosition ?? (await TrackPlayer.getProgress()).position
      if (trackDuration && position >= trackDuration - TRACK_END_BUFFER) return
      dispatch(
        setTrackPosition({
          userId,
          trackId,
          positionInfo: { status: 'IN_PROGRESS', playbackPosition: position }
        })
      )
    },
    [dispatch, userId, trackId, isTrackLongFormContent, trackDuration]
  )

  useTrackPlayerEvents(events, async (event) => {
    if (event.type === Event.PlaybackState) {
      if (event.state === State.Paused || event.state === State.Stopped) {
        await savePosition()
      }
    } else if (event.type === Event.PlaybackActiveTrackChanged) {
      if (event.lastPosition !== undefined) {
        await savePosition(event.lastPosition)
      }
    } else if (event.type === Event.PlaybackQueueEnded) {
      await savePosition(event.position)
    }
  })

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        savePosition()
      }
    })
    return () => sub.remove()
  }, [savePosition])
}
