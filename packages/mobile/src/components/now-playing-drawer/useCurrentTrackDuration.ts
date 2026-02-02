import { useCurrentTrack } from '@audius/common/hooks'
import { playerSelectors } from '@audius/common/store'
import { getTrackPreviewDuration } from '@audius/common/utils'
import { useSelector } from 'react-redux'

const { getPreviewing } = playerSelectors

export const useCurrentTrackDuration = () => {
  const track = useCurrentTrack()
  const isPreviewing = useSelector(getPreviewing)

  return !track
    ? 0
    : isPreviewing
      ? getTrackPreviewDuration(track)
      : track.duration
}
