import { memo } from 'react'

import { useTrack } from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import { SquareSizes, Color, ID } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import {
  createKeyboardActivationHandler,
  Tooltip,
  Image
} from '@audius/harmony'
import { animated, useSpring } from '@react-spring/web'
import cn from 'classnames'
import { useSelector } from 'react-redux'

import { Draggable } from 'components/dragndrop'
import { LockedStatusBadge } from 'components/locked-status-badge'
import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { fullTrackPage } from 'utils/route'

import styles from './PlayingTrackInfo.module.css'
const { getPreviewing } = playbackSelectors

const messages = {
  preview: 'Preview'
}

interface PlayingTrackInfoProps {
  trackId: number
  isOwner: boolean
  trackTitle: string
  trackPermalink: string
  isVerified: boolean
  isTrackUnlisted: boolean
  isStreamGated: boolean
  artistUserId: ID
  artistName: string
  artistHandle: string
  hasShadow: boolean
  dominantColor?: Color
  /** When true, title and artist wrap instead of single-line ellipsis (e.g. visualizer overlay). */
  fullTrackText?: boolean
  hideArt?: boolean
  onClickTrackTitle: () => void
  onClickArtistName: () => void
}

const springProps = {
  from: { opacity: 0.6 },
  to: { opacity: 1 },
  reset: true,
  config: { tension: 240, friction: 25 }
}

const PlayingTrackInfo = ({
  trackId,
  isOwner,
  trackTitle,
  trackPermalink,
  artistUserId,
  artistName,
  onClickTrackTitle,
  onClickArtistName,
  isTrackUnlisted,
  isStreamGated,
  hasShadow,
  dominantColor,
  fullTrackText,
  hideArt = false
}: PlayingTrackInfoProps) => {
  const { data: track } = useTrack(trackId, {
    select: (track) => ({
      track_id: track?.track_id,
      stream_conditions: track?.stream_conditions,
      download_conditions: track?.download_conditions,
      access: track?.access,
      is_stream_gated: track?.is_stream_gated,
      is_download_gated: track?.is_download_gated,
      preview_cid: track?.preview_cid
    })
  })
  const { hasStreamAccess } = useGatedContentAccess(track)
  const isPreviewing = useSelector(getPreviewing)
  const shouldShowPreviewLock =
    isPreviewing ||
    (track?.stream_conditions &&
      'usdc_purchase' in track.stream_conditions &&
      !hasStreamAccess)

  const spring = useSpring(springProps)
  const profileImage = useProfilePicture({
    userId: artistUserId ?? null,
    size: SquareSizes.SIZE_150_BY_150
  })

  const boxShadowStyle =
    hasShadow && dominantColor
      ? {
          boxShadow: `0px 3px 5px rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.5), 0px 3px 4px rgba(133, 129, 153, 0.25)`
        }
      : {}

  const renderTrackTitle = () => {
    return (
      <animated.div style={spring} className={styles.trackTitleContainer}>
        <Tooltip text={trackTitle} placement='top' mount='body'>
          <div
            className={cn(styles.trackTitle, {
              [styles.textShadow]: hasShadow
            })}
            onClick={onClickTrackTitle}
            onKeyDown={createKeyboardActivationHandler<HTMLDivElement>({
              onActivate: onClickTrackTitle
            })}
            role='button'
            tabIndex={0}
            aria-label={`View track: ${trackTitle}`}
          >
            {trackTitle}
          </div>
        </Tooltip>
        {shouldShowPreviewLock ? (
          <LockedStatusBadge
            locked
            iconSize='2xs'
            coloredWhenLocked
            variant='premium'
            text={messages.preview}
          />
        ) : null}
      </animated.div>
    )
  }

  return (
    <div
      className={cn(styles.info, {
        [styles.fullTrackText]: fullTrackText,
        [styles.noArt]: hideArt
      })}
    >
      {!hideArt && (
        <div className={styles.profilePictureWrapper}>
          <Image
            src={profileImage}
            onClick={onClickArtistName}
            className={cn(styles.profilePicture, {
              [styles.isDefault]: !!trackId
            })}
            style={boxShadowStyle}
          />
        </div>
      )}
      <div className={styles.text}>
        {isStreamGated ? (
          renderTrackTitle()
        ) : (
          <Draggable
            isDisabled={!trackTitle || isTrackUnlisted}
            text={trackTitle}
            isOwner={isOwner}
            kind='track'
            id={trackId}
            link={fullTrackPage(trackPermalink)}
          >
            {renderTrackTitle()}
          </Draggable>
        )}
        <animated.div style={spring} className={styles.artistNameWrapper}>
          <div
            className={cn(styles.artistName, {
              [styles.textShadow]: hasShadow
            })}
            onClick={onClickArtistName}
            onKeyDown={createKeyboardActivationHandler<HTMLDivElement>({
              onActivate: onClickArtistName
            })}
            role='button'
            tabIndex={0}
            aria-label={`View artist: ${artistName}`}
          >
            {artistName}
          </div>
          <UserBadges userId={artistUserId} className={styles.iconVerified} />
        </animated.div>
      </div>
    </div>
  )
}

export default memo(PlayingTrackInfo)
