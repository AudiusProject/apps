import { useCurrentUserId } from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  playerSelectors,
  playbackPositionSelectors,
  CommonState,
  getCurrentTrackId
} from '@audius/common/store'
import {
  Button,
  IconRepeatOff as IconRepeat,
  IconPause,
  IconPlay
} from '@audius/harmony'
import { useSelector } from 'react-redux'

const { getTrackId } = playerSelectors
const { getTrackPosition } = playbackPositionSelectors

type PlayPauseButtonProps = {
  disabled?: boolean
  isPreview?: boolean
  playing: boolean
  trackId?: ID
  onPlay: () => void
}

const messages = {
  play: 'play',
  preview: 'preview',
  pause: 'pause',
  resume: 'resume',
  replay: 'replay'
}

export const PlayPauseButton = ({
  disabled,
  isPreview = false,
  playing,
  trackId,
  onPlay
}: PlayPauseButtonProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const trackPlaybackInfo = useSelector((state: CommonState) =>
    getTrackPosition(state, { trackId, userId: currentUserId })
  )
  // Check both old and new playback systems
  const oldCurrentTrackId = useSelector((state: CommonState) =>
    getTrackId(state)
  )
  const newCurrentTrackId = useSelector((state: CommonState) =>
    getCurrentTrackId(state)
  )
  const isCurrentTrack =
    trackId === oldCurrentTrackId || trackId === newCurrentTrackId

  let playText
  let PlayIconComponent
  if (isPreview) {
    playText = messages.preview
    PlayIconComponent = IconPlay
  } else {
    playText = trackPlaybackInfo
      ? trackPlaybackInfo.status === 'IN_PROGRESS' || isCurrentTrack
        ? messages.resume
        : messages.replay
      : messages.play
    PlayIconComponent =
      trackPlaybackInfo?.status === 'COMPLETED' && !isCurrentTrack
        ? IconRepeat
        : IconPlay
  }

  return (
    <Button
      name={isPreview ? 'preview' : 'play'}
      size='large'
      variant={isPreview ? 'secondary' : 'primary'}
      iconLeft={playing ? IconPause : PlayIconComponent}
      onClick={onPlay}
      minWidth={180}
      disabled={disabled}
      translate='no'
    >
      {playing ? messages.pause : playText}
    </Button>
  )
}
