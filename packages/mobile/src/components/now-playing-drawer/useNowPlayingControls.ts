import { useCallback, useEffect, useState } from 'react'

import { useTimestampedComments, useUser } from '@audius/common/api'
import { useCurrentTrack, useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import { Genre } from '@audius/common/utils'
import TrackPlayer from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'

import {
  RESTART_THRESHOLD_SEC,
  SKIP_DURATION_SEC
} from 'app/components/audio/constants'

import { useCurrentTrackDuration } from './useCurrentTrackDuration'
import { useDominantArtworkColors } from './useDominantArtworkColors'

const { seekTo: seek, reset, next, previous } = playbackActions
const { getPlaying, getTrackId, getCounter, getBuffering } = playbackSelectors

export const useNowPlayingControls = (isVisible: boolean) => {
  const dispatch = useDispatch()
  const playCounter = useSelector(getCounter)
  const currentTrackId = useSelector(getTrackId)
  const isPlaying = useSelector(getPlaying)
  const isBuffering = useSelector(getBuffering)
  const track = useCurrentTrack()
  const trackDuration = useCurrentTrackDuration()
  const trackId = track?.track_id
  const { data: user } = useUser(track?.owner_id)
  const [mediaKey, setMediaKey] = useState(0)

  const { isEnabled: isNowPlayingCommentsEnabled } = useFeatureFlag(
    FeatureFlags.NOW_PLAYING_COMMENTS
  )
  const { isEnabled: isWaveformEnabled } = useFeatureFlag(
    FeatureFlags.NOW_PLAYING_WAVEFORM
  )
  useDominantArtworkColors(trackId, !!isWaveformEnabled && isVisible)
  const timestampedComments = useTimestampedComments(
    trackId,
    (!!isNowPlayingCommentsEnabled || !!isWaveformEnabled) && isVisible
  )

  useEffect(() => {
    setMediaKey((key) => key + 1)
  }, [playCounter, currentTrackId])

  const isLongFormContent =
    track?.genre === Genre.Podcasts || track?.genre === Genre.Audiobooks

  const onNext = useCallback(async () => {
    if (isLongFormContent && track) {
      const { position } = await TrackPlayer.getProgress()
      dispatch(
        seek({
          seconds: Math.min(track.duration, position + SKIP_DURATION_SEC)
        })
      )
    } else {
      dispatch(next({ skip: true }))
      setMediaKey((key) => key + 1)
    }
  }, [dispatch, isLongFormContent, track])

  const onPrevious = useCallback(async () => {
    const { position } = await TrackPlayer.getProgress()
    if (isLongFormContent) {
      dispatch(seek({ seconds: Math.max(0, position - SKIP_DURATION_SEC) }))
    } else if (position < RESTART_THRESHOLD_SEC) {
      dispatch(previous())
      setMediaKey((key) => key + 1)
    } else {
      dispatch(reset({ shouldAutoplay: true }))
    }
  }, [dispatch, isLongFormContent])

  const onSeek = useCallback(
    (seconds: number) => {
      dispatch(seek({ seconds }))
    },
    [dispatch]
  )

  return {
    track,
    trackId,
    user,
    trackDuration,
    mediaKey: `${mediaKey}`,
    isPlaying,
    isBuffering,
    isLongFormContent,
    isNowPlayingCommentsEnabled: !!isNowPlayingCommentsEnabled,
    isWaveformEnabled: !!isWaveformEnabled,
    timestampedComments,
    onNext,
    onPrevious,
    onSeek
  }
}
