import { useEffect, useRef } from 'react'

import { useCurrentUserId, useTrack } from '@audius/common/api'
import {
  playbackPositionActions,
  playbackSelectors
} from '@audius/common/store'
import { isLongFormContent } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { audioPlayer } from 'services/audio-player'

const { setTrackPosition } = playbackPositionActions
const { getPlaying, getTrackId } = playbackSelectors

const RECORD_PLAYBACK_POSITION_INTERVAL = 1000

export const usePlaybackPositionPolling = () => {
  const dispatch = useDispatch()
  const trackId = useSelector(getTrackId)
  const playing = useSelector(getPlaying)
  const { data: currentUserId } = useCurrentUserId()
  const { data: isLongForm = false } = useTrack(trackId, {
    select: isLongFormContent
  })

  const stateRef = useRef({ trackId, playing, currentUserId, isLongForm })
  stateRef.current = { trackId, playing, currentUserId, isLongForm }

  useEffect(() => {
    const player = audioPlayer
    if (!player || !playing || !isLongForm) return
    const interval = setInterval(() => {
      const {
        trackId: tId,
        playing: isPlaying,
        currentUserId: uId,
        isLongForm: longForm
      } = stateRef.current
      if (!uId || !tId || !isPlaying || !longForm) return
      const position = player.getPosition()
      dispatch(
        setTrackPosition({
          userId: uId,
          trackId: tId,
          positionInfo: {
            status: 'IN_PROGRESS',
            playbackPosition: position
          }
        })
      )
    }, RECORD_PLAYBACK_POSITION_INTERVAL)
    return () => clearInterval(interval)
  }, [dispatch, playing, isLongForm])
}
