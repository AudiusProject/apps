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
  const { data: track } = useTrack(trackId)

  const stateRef = useRef({ trackId, playing, currentUserId, track })
  stateRef.current = { trackId, playing, currentUserId, track }

  useEffect(() => {
    const player = audioPlayer
    if (!player) return
    const interval = setInterval(() => {
      const {
        trackId: tId,
        playing: isPlaying,
        currentUserId: uId,
        track: t
      } = stateRef.current
      if (!uId || !tId || !isPlaying) return
      if (!isLongFormContent(t)) return
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
  }, [dispatch])
}
