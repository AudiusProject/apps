import { useCurrentUserId } from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  playerSelectors,
  playbackPositionSelectors,
  CommonState
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
  const isCurrentTrack = useSelector(
    (state: CommonState) => trackId === getTrackId(state)
  )

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
