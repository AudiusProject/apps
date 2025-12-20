import { useEffect, useState } from 'react'

import { useCurrentTrack } from '@audius/common/hooks'
import { playerSelectors } from '@audius/common/store'
import { getTrackPreviewDuration } from '@audius/common/utils'
import TrackPlayer from 'react-native-track-player'
import { useSelector } from 'react-redux'
import { useAsync } from 'react-use'

const { getPreviewing } = playerSelectors

export const useCurrentTrackDuration = () => {
  const track = useCurrentTrack()
  const isPreviewing = useSelector(getPreviewing)
  const [durationFromPlayer, setDurationFromPlayer] = useState<number | null>(
    null
  )

  // Fetch duration from TrackPlayer when track duration is not available
  // This handles cases where react-native-track-player v5 doesn't immediately
  // provide duration from the track metadata
  useAsync(async () => {
    if (track) {
      try {
        const progress = await TrackPlayer.getProgress()
        if (progress.duration > 0) {
          setDurationFromPlayer(progress.duration)
        }
      } catch (e) {
        // TrackPlayer might not be ready yet, ignore error
      }
    }
  }, [track?.track_id])

  // Reset duration when track changes
  useEffect(() => {
    setDurationFromPlayer(null)
  }, [track?.track_id])

  if (!track) {
    return 0
  }

  // Use duration from TrackPlayer if available, otherwise fall back to track metadata
  const baseDuration = durationFromPlayer ?? track.duration ?? 0

  return isPreviewing ? getTrackPreviewDuration(track) : baseDuration
}
