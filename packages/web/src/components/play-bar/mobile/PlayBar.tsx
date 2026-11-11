import { useEffect, useState } from 'react'

import { useToggleFavoriteTrack, useUser } from '@audius/common/api'
import { useCurrentTrack, useGatedContentAccess } from '@audius/common/hooks'
import {
  Name,
  FavoriteSource,
  PlaybackSource,
  SquareSizes,
  ID
} from '@audius/common/models'
import {
  playbackActions,
  playbackSelectors,
  tracksSocialActions
} from '@audius/common/store'
import {
  createKeyboardActivationHandler,
  IconImage,
  IconLock
} from '@audius/harmony'
import cn from 'classnames'
import { connect, useSelector } from 'react-redux'
import { Dispatch } from 'redux'

import { make, useRecord } from 'common/store/analytics/actions'
import FavoriteButton from 'components/alt-button/FavoriteButton'
import { LockedStatusBadge } from 'components/locked-status-badge'
import PlayButton from 'components/play-bar/PlayButton'
import TrackingBar from 'components/play-bar/TrackingBar'
import { PlayButtonStatus } from 'components/play-bar/types'
import TrackFlair, { Size } from 'components/track-flair/TrackFlair'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { audioPlayer } from 'services/audio-player'
import { AppState } from 'store/types'
import { useIsDarkMode, useIsMatrix } from 'utils/theme/theme'

import styles from './PlayBar.module.css'
const { makeGetCurrent } = playbackSelectors
const { getPreviewing, getBuffering, getCounter, getPlaying } =
  playbackSelectors
const { recordListen } = tracksSocialActions
const { pause, play } = playbackActions

const SEEK_INTERVAL = 200

const messages = {
  preview: 'preview'
}

/**
 * Owns the progress state so the 200ms updates only re-render the bar,
 * not the whole PlayBar
 */
const PlayBarTrackingBar = ({
  isPlaying,
  trackId: queueTrackId
}: {
  isPlaying: boolean
  trackId: ID | null
}) => {
  const [percentComplete, setPercentComplete] = useState(0)

  // Sync right away whenever play state or the track changes, then poll.
  // Polling while paused picks up seeks; an unchanged percent doesn't render.
  useEffect(() => {
    const updatePercentComplete = () => {
      if (!audioPlayer) {
        return
      }
      const duration = audioPlayer.getDuration()
      const pos = audioPlayer.getPosition()
      if (duration === undefined || pos === undefined) return

      const position = Math.min(pos, duration)
      const percent = (position / duration) * 100
      if (percent) setPercentComplete(percent)
    }
    updatePercentComplete()
    const seekInterval = setInterval(updatePercentComplete, SEEK_INTERVAL)
    return () => clearInterval(seekInterval)
  }, [isPlaying, queueTrackId])

  return <TrackingBar percentComplete={percentComplete} />
}

type OwnProps = {
  onClickInfo: () => void
}

type PlayBarProps = OwnProps &
  ReturnType<ReturnType<typeof makeMapStateToProps>> &
  ReturnType<typeof mapDispatchToProps>

const PlayBar = ({
  currentQueueItem,
  isPlaying,
  isBuffering,
  play,
  pause,
  onClickInfo
}: PlayBarProps) => {
  const { trackId: queueTrackId } = currentQueueItem
  const track = useCurrentTrack()
  const isDarkMode = useIsDarkMode()
  const isMatrixMode = useIsMatrix()
  const { data: user } = useUser(track?.owner_id)

  const record = useRecord()

  const { imageUrl: image, hasNoArtwork } = useTrackCoverArt({
    trackId: track ? track.track_id : undefined,
    size: SquareSizes.SIZE_150_BY_150,
    defaultImage: ''
  })

  const { hasStreamAccess } = useGatedContentAccess(track)
  const isPreviewing = useSelector(getPreviewing)
  const shouldShowPreviewLock =
    isPreviewing ||
    (track?.stream_conditions &&
      'usdc_purchase' in track.stream_conditions &&
      !hasStreamAccess)

  const toggleFavorite = useToggleFavoriteTrack({
    trackId: track?.track_id,
    source: FavoriteSource.PLAYBAR
  })

  if (!queueTrackId || !track || !user) return null

  const {
    title,
    track_id,
    has_current_user_saved,
    is_unlisted: isUnlisted
  } = track

  const { name } = user
  const infoLabel = `View current track: ${title} by ${name}`

  let playButtonStatus
  if (isBuffering) {
    playButtonStatus = PlayButtonStatus.LOAD
  } else if (isPlaying) {
    playButtonStatus = PlayButtonStatus.PAUSE
  } else {
    playButtonStatus = PlayButtonStatus.PLAY
  }

  const togglePlay = () => {
    if (isPlaying) {
      pause()
      record(
        make(Name.PLAYBACK_PAUSE, {
          id: `${track_id}`,
          source: PlaybackSource.PLAYBAR
        })
      )
    } else {
      play()
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${track_id}`,
          source: PlaybackSource.PLAYBAR
        })
      )
    }
  }

  return (
    <>
      <div className={styles.playBar}>
        <PlayBarTrackingBar isPlaying={isPlaying} trackId={queueTrackId} />
        <div className={styles.controls}>
          {shouldShowPreviewLock || isUnlisted ? null : (
            <FavoriteButton
              isDisabled={track?.is_unlisted}
              onClick={toggleFavorite}
              isDarkMode={isDarkMode}
              isMatrixMode={isMatrixMode}
              isActive={has_current_user_saved}
              className={styles.favorite}
            />
          )}
          <div
            className={styles.info}
            onClick={onClickInfo}
            onKeyDown={createKeyboardActivationHandler<HTMLDivElement>({
              onActivate: onClickInfo
            })}
            role='button'
            tabIndex={0}
            aria-label={infoLabel}
          >
            {track?.track_id ? (
              <TrackFlair
                className={styles.artwork}
                size={Size.TINY}
                id={track?.track_id}
              >
                <div
                  className={cn(styles.image, {
                    [styles.imageEmpty]: hasNoArtwork
                  })}
                  style={
                    image ? { backgroundImage: `url(${image})` } : undefined
                  }
                >
                  {hasNoArtwork ? (
                    <div className={styles.emptyArtworkIcon}>
                      <IconImage width={14} height={14} />
                    </div>
                  ) : null}
                  {shouldShowPreviewLock ? (
                    <div className={styles.lockOverlay}>
                      <IconLock className={styles.iconLock} />
                    </div>
                  ) : null}
                </div>
              </TrackFlair>
            ) : null}
            <div className={styles.text}>
              <div className={styles.titleLine}>
                <span className={styles.title}>{title}</span>
                <span className={styles.separator}>•</span>
                <span className={styles.artist}>{name}</span>
              </div>
            </div>
            {shouldShowPreviewLock ? (
              <div className={styles.lockPreview}>
                <LockedStatusBadge
                  locked
                  variant='premium'
                  text={messages.preview}
                  coloredWhenLocked
                  iconSize='2xs'
                />
              </div>
            ) : null}
          </div>
          <div className={styles.play}>
            <PlayButton
              playable
              status={playButtonStatus}
              onClick={togglePlay}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function makeMapStateToProps() {
  const getCurrentQueueItem = makeGetCurrent()

  const mapStateToProps = (state: AppState) => ({
    currentQueueItem: getCurrentQueueItem(state),
    playCounter: getCounter(state),
    isPlaying: getPlaying(state),
    isBuffering: getBuffering(state)
  })
  return mapStateToProps
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    play: () => {
      dispatch(play({}))
    },
    pause: () => {
      dispatch(pause({}))
    },
    recordListen: (trackId: ID) => dispatch(recordListen(trackId))
  }
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PlayBar)
